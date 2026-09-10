import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { OpenSlimeditPlugin } from '../plugin/OpenSlimEdit.ts';

const hooks = await OpenSlimeditPlugin({ directory: '/tmp' });

test('tool descriptions name installed navigation tools and do not claim FileTime integration', async () => {
  for (const toolID of ['read', 'edit', 'write', 'grep', 'lsp']) {
    const output = { description: 'original', parameters: {} };
    await hooks['tool.definition']({ toolID }, output);
    assert.notEqual(output.description, 'original');
    assert.doesNotMatch(output.description, /CKB|ckb_|FileTime|or this tool will error|Must use cachebro/);
    if (['grep', 'lsp'].includes(toolID)) assert.match(output.description, /tilth_tilth_search/);
  }
});

test('unknown tool definitions are left untouched', async () => {
  const output = { description: 'original', parameters: {} };
  await hooks['tool.definition']({ toolID: 'firecrawl_firecrawl_search' }, output);
  assert.equal(output.description, 'original');
});

test('line-range edits expand valid ranges, preserve literal text, and reject malformed arguments', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'opencode-plugin-test-'));
  try {
    await writeFile(path.join(directory, 'fixture.txt'), 'one\ntwo\nthree\n');
    const plugin = await OpenSlimeditPlugin({ directory });
    const before = plugin['tool.execute.before'];
    const call = { tool: 'edit', sessionID: 'test', callID: 'test' };
    const output = { args: { filePath: 'fixture.txt', oldString: '2-3', newString: 'changed' } };
    await before(call, output);
    assert.equal(output.args.oldString, 'two\nthree');
    for (const oldString of ['two', '9-10', '3-2', 123, null]) {
      const untouched = { args: { filePath: 'fixture.txt', oldString } };
      await before(call, untouched);
      assert.equal(untouched.args.oldString, oldString);
    }
    const otherTool = { args: { filePath: 'fixture.txt', oldString: '2-3' } };
    await before({ ...call, tool: 'write' }, otherTool);
    assert.equal(otherTool.args.oldString, '2-3');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('read output is compacted without changing unrelated tools or directories', async () => {
  const output = { output: '<path>/tmp/fixture.txt</path>\n<type>file</type>\n1: one\n\n(End of file - total 1 lines)\n' };
  await hooks['tool.execute.after']({ tool: 'read' }, output);
  assert.match(output.output, /<path>fixture.txt<\/path>/);
  assert.match(output.output, /1: one/);
  assert.doesNotMatch(output.output, /<type>|End of file/);
  for (const [tool, text] of [['read', '<type>directory</type>'], ['bash', '<path>/tmp/fixture.txt</path>']]) {
    const unchanged = { output: text };
    await hooks['tool.execute.after']({ tool }, unchanged);
    assert.equal(unchanged.output, text);
  }
});
