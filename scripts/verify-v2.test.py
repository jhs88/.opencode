#!/usr/bin/env python3
"""Regression checks for the native V2 verifier and reviewer permissions."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("verify_firecrawl", ROOT / "scripts/verify-firecrawl.py")
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


class V2Checks(unittest.TestCase):
    def test_config_sources_select_this_config_and_restore_redacted_environment(self):
        config = {
            "mcp": {"servers": {"firecrawl": {"environment": {
                "FIRECRAWL_API_URL": "http://localhost:3002",
                "FIRECRAWL_API_KEY": "***",
                "FIRECRAWL_OAUTH_TOKEN": "***",
            }}}},
            "permissions": [], "plugins": [],
        }
        sources = [
            {"type": "document", "path": str(ROOT / "opencode.jsonc"), "info": config},
            {"type": "directory", "path": str(ROOT)},
        ]

        def debug_config(command, **kwargs):
            self.assertEqual(command, ["opencode", "debug", "config"])
            json.dump(sources, kwargs["stdout"])

        with tempfile.TemporaryDirectory() as directory, patch.object(verify.subprocess, "run", side_effect=debug_config), patch.dict(os.environ, {
            "FIRECRAWL_API_KEY": "test-key",
            "FIRECRAWL_OAUTH_TOKEN": "must-not-inherit",
        }):
            resolved = verify.resolve_config(Path(directory))
        env = resolved["mcp"]["servers"]["firecrawl"]["environment"]
        self.assertEqual(env["FIRECRAWL_API_KEY"], "test-key")
        self.assertEqual(env["FIRECRAWL_OAUTH_TOKEN"], "")

    def test_missing_active_config_has_a_clear_error(self):
        def debug_config(command, **kwargs):
            json.dump([{"type": "directory", "path": "/tmp"}], kwargs["stdout"])

        with tempfile.TemporaryDirectory() as directory, patch.object(verify.subprocess, "run", side_effect=debug_config):
            with self.assertRaisesRegex(RuntimeError, "not loaded"):
                verify.resolve_config(Path(directory))

    def test_permission_rules_match_action_and_resource_with_last_match_winning(self):
        rules = [
            {"action": "firecrawl_*", "resource": "*", "effect": "deny"},
            {"action": "firecrawl_firecrawl_search", "resource": "*", "effect": "allow"},
            {"action": "firecrawl_firecrawl_crawl", "resource": "*", "effect": "ask"},
            {"action": "firecrawl_firecrawl_search", "resource": "private/*", "effect": "deny"},
        ]
        self.assertEqual(verify.permission_effect(rules, "firecrawl_firecrawl_search"), "allow")
        self.assertEqual(verify.permission_effect(rules, "firecrawl_firecrawl_search", "private/query"), "deny")
        self.assertEqual(verify.permission_effect(rules, "firecrawl_firecrawl_crawl"), "ask")
        self.assertEqual(verify.permission_effect(rules, "firecrawl_firecrawl_agent"), "deny")

    def test_mcp_uses_native_catalog_and_execution_timeouts(self):
        config = {"command": ["unused"], "timeout": {"catalog": 1000, "execution": 5000}}
        with tempfile.TemporaryDirectory() as directory, patch.object(verify.subprocess, "Popen") as launch:
            launch.return_value.stdout = []
            mcp = verify.MCP(config, Path(directory))
            try:
                self.assertEqual(mcp.timeout, 1)
                with patch.object(mcp, "call", return_value={"content": [{"type": "text", "text": "{}"}]}) as call:
                    mcp.tool("firecrawl_search", {"query": "test"})
                    self.assertEqual(call.call_args.kwargs["timeout"], 5)
            finally:
                mcp.reader.join(timeout=2)
                mcp.errors.close()

    def test_resolved_reviewer_allows_review_commands_and_denies_mutation(self):
        agents = json.loads(subprocess.check_output(["opencode", "debug", "agents"], cwd=ROOT, text=True, timeout=30))
        reviewer = next(agent for agent in agents if agent["name"] == "reviewer")
        rules = reviewer["permissions"]
        for command in ["git diff HEAD", "git show HEAD", "git log -5", "git blame README.md", "rg permissions agents", "wc -l README.md", "head -5 README.md", "tail -5 README.md"]:
            with self.subTest(command=command):
                self.assertEqual(verify.permission_effect(rules, "shell", command), "allow")
        for command in ["git commit -am change", "rm README.md", "curl example.com"]:
            with self.subTest(command=command):
                self.assertEqual(verify.permission_effect(rules, "shell", command), "deny")
        self.assertEqual(verify.permission_effect(rules, "edit", "README.md"), "deny")


if __name__ == "__main__":
    unittest.main()
