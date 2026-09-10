#!/usr/bin/env python3
"""Verify active OpenCode Firecrawl config and MCP, without model inference.

Default: config validation and MCP tool discovery only.
--live: also scrape, search, map, and run/read back a one-page crawl.
All processes and temporary files belong to this verification run.
"""
import argparse
import fnmatch
import json
import os
from pathlib import Path
import queue
import signal
import subprocess
import tempfile
import threading
import time
from urllib.parse import urlparse

EXPECTED = {
    "firecrawl_search", "firecrawl_scrape", "firecrawl_map",
    "firecrawl_crawl", "firecrawl_check_crawl_status",
}


def resolve_config(directory):
    # Direct-to-file avoids truncated large JSON from CLI stdout pipes.
    target = directory / "resolved.json"
    with target.open("w") as output:
        subprocess.run(["opencode", "debug", "config"], cwd=directory,
                       stdout=output, check=True, timeout=90)
    return json.loads(target.read_text())


class MCP:
    def __init__(self, config, directory):
        self.timeout = config["timeout"] / 1000
        env = {**os.environ, **config.get("environment", {})}
        self.errors = (directory / "mcp-stderr.log").open("w+")
        self.process = subprocess.Popen(config["command"], cwd=directory, env=env,
                                        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        stderr=self.errors, text=True, bufsize=1,
                                        start_new_session=True)
        assert self.process.stdin is not None and self.process.stdout is not None
        self.stdin = self.process.stdin
        self.stdout = self.process.stdout
        self.messages = queue.Queue()
        self.sequence = 0
        self.directory = directory
        self.reader = threading.Thread(target=self.read, daemon=True)
        self.reader.start()

    def read(self):
        for line in self.stdout:
            try:
                self.messages.put(json.loads(line))
            except json.JSONDecodeError:
                self.messages.put({"protocol_error": "Non-JSON stdout from MCP"})
        self.messages.put({"protocol_error": "MCP stdout closed"})

    def send(self, payload):
        self.stdin.write(json.dumps({"jsonrpc": "2.0", **payload}) + "\n")
        self.stdin.flush()

    def call(self, method, params, timeout=None):
        if timeout is None:
            timeout = self.timeout
        self.sequence += 1
        request_id = self.sequence
        self.send({"id": request_id, "method": method, "params": params})
        deadline = time.monotonic() + timeout
        while True:
            message = self.messages.get(timeout=max(0.01, deadline-time.monotonic()))
            if "protocol_error" in message:
                raise RuntimeError(message["protocol_error"])
            if "method" in message and "id" in message:
                if message["method"] == "roots/list":
                    self.send({"id": message["id"], "result": {"roots": [{"uri": self.directory.as_uri()}]}})
                elif message["method"] == "ping":
                    self.send({"id": message["id"], "result": {}})
                else:
                    self.send({"id": message["id"], "error": {"code": -32601, "message": "Unsupported client method"}})
            elif message.get("id") == request_id:
                if "error" in message:
                    raise RuntimeError(message["error"])
                return message["result"]
            if time.monotonic() >= deadline:
                raise TimeoutError(method)

    def tool(self, name, args):
        response = self.call("tools/call", {"name": name, "arguments": args})
        assert not response.get("isError"), response
        text = "\n".join(x["text"] for x in response.get("content", []) if x.get("type") == "text")
        return json.loads(text)

    def close(self):
        self.stdin.close()
        try:
            self.process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            pass
        # The npx launcher may exit before its server. Reap the owned group
        # independently of the launcher's exit status.
        try:
            os.killpg(self.process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            self.process.poll()
            try:
                os.killpg(self.process.pid, 0)
            except ProcessLookupError:
                break
            time.sleep(0.05)
        else:
            try:
                os.killpg(self.process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        self.process.wait(timeout=3)
        self.reader.join(timeout=2)
        self.stdout.close()
        self.errors.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="opencode-firecrawl-verify-") as name:
        directory = Path(name)
        config = resolve_config(directory)
        server = config["mcp"]["firecrawl"]
        assert server["type"] == "local" and server["enabled"] is True
        assert server["command"] == ['sh', '-c', ': "${FIRECRAWL_API_URL:?Set FIRECRAWL_API_URL to your self-hosted Firecrawl endpoint}"; exec npx -y firecrawl-mcp@3.23.7']
        env = server["environment"]
        if not env.get("FIRECRAWL_API_URL"):
            raise SystemExit("Export FIRECRAWL_API_URL before running this check.")
        endpoint = urlparse(env["FIRECRAWL_API_URL"])
        assert endpoint.scheme in {"http", "https"} and endpoint.hostname
        assert endpoint.hostname not in {"api.firecrawl.dev", "mcp.firecrawl.dev"}
        assert env["FIRECRAWL_NO_SEARCH_FEEDBACK"] == env["FIRECRAWL_NO_ENDPOINT_FEEDBACK"] == "1"
        assert not any("cachebro-bridge" in str(p) for p in config["plugin"])
        assert config["permission"]["firecrawl_firecrawl_crawl"] == "ask"
        print("PASS active config: pinned local MCP, explicit self-hosted endpoint, crawl approval, retired bridge")
        mcp = MCP(server, directory)
        try:
            mcp.call("initialize", {"protocolVersion": "2024-11-05", "capabilities": {"roots": {}},
                                   "clientInfo": {"name": "opencode-config-verification", "version": "1.0.0"}})
            mcp.send({"method": "notifications/initialized"})
            tools = mcp.call("tools/list", {})["tools"]
            names = {t["name"] for t in tools}
            assert EXPECTED <= names
            enabled = set()
            for tool in names:
                action = "allow"
                for pattern, rule in config["permission"].items():
                    if fnmatch.fnmatchcase("firecrawl_" + tool, pattern):
                        action = rule
                if action != "deny":
                    enabled.add(tool)
            assert enabled == EXPECTED, enabled
            print("PASS MCP discovery and resolved permission rules:", ", ".join(sorted(enabled)))
            if args.live:
                scraped = mcp.tool("firecrawl_scrape", {"url": "https://example.com", "formats": ["markdown"]})
                assert "Example Domain" in scraped["markdown"]
                print("PASS live scrape: Example Domain")
                searched = mcp.tool("firecrawl_search", {"query": "OpenCode MCP documentation", "limit": 2})
                results = searched["data"]["web"]
                assert results and any("opencode.ai" in x["url"] for x in results)
                print("PASS live search:", len(results), "results including opencode.ai")
                mapped = mcp.tool("firecrawl_map", {"url": "https://opencode.ai", "limit": 2})
                assert mapped.get("links"), mapped
                print("PASS live map:", len(mapped["links"]), "link(s)")
                crawled = mcp.tool("firecrawl_crawl", {"url": "https://example.com", "limit": 1,
                    "maxDiscoveryDepth": 0, "allowExternalLinks": False, "allowSubdomains": False,
                    "crawlEntireDomain": False, "sitemap": "skip", "maxConcurrency": 1,
                    "scrapeOptions": {"formats": ["markdown"]}})
                assert crawled.get("status") == "completed", crawled
                job_id = crawled.get("id")
                assert job_id, "No crawl ID available for independent readback"
                checked = mcp.tool("firecrawl_check_crawl_status", {"id": job_id})
                assert checked.get("status") == "completed", checked
                assert checked.get("completed") == 1, checked
                print("PASS live bounded crawl and independent status readback:", job_id, "completed=1")
        finally:
            mcp.close()
    print("PASS cleanup: verification MCP stopped; temporary config and results removed")


if __name__ == "__main__":
    # Convert catchable termination into stack unwinding so finally blocks run.
    def terminate(signum, _frame):
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, terminate)
    signal.signal(signal.SIGHUP, terminate)
    main()
