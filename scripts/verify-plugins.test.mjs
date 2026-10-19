import test from 'node:test';
import assert from 'node:assert/strict';
import pluginDefault, { expandLineRange, compactReadOutput, SLIM } from '../plugins/OpenSlimEdit.ts';

test('plugin default export is a V2 definition with a stable id and setup', () => {
  assert.equal(pluginDefault.id, 'openslimedit');
  assert.equal(typeof pluginDefault.setup, 'function');
});

test('slim descriptions cover V2 tool ids and keep navigation routing', () => {
  for (const toolID of ['read', 'edit', 'write', 'glob', 'grep', 'shell', 'subagent', 'webfetch']) {
    assert.ok(SLIM[toolID], `missing slim description for ${toolID}`);
    assert.doesNotMatch(SLIM[toolID], /cachebro|CKB|ckb_|FileTime|or this tool will error/i);
  }
  assert.match(SLIM.read, /Read file\/directory/);
  assert.match(SLIM.grep, /tilth_tilth_search/);
  // V1-only tool ids must not linger (lsp is not a V2 core tool, bash/task were renamed)
  for (const legacy of ['bash', 'task', 'lsp', 'multiedit', 'batch', 'todowrite', 'todoread', 'list']) {
    assert.equal(SLIM[legacy], undefined, `legacy tool id ${legacy} should not be slimmed`);
  }
});

test('line-range edits expand valid ranges, preserve literal text, and reject malformed input', () => {
  const content = 'one\ntwo\nthree\n';
  assert.equal(expandLineRange(content, '2-3'), 'two\nthree');
  assert.equal(expandLineRange(content, '2'), 'two');
  assert.equal(expandLineRange(content, ' 2-3 '), 'two\nthree');
  // Literal match present: no expansion
  assert.equal(expandLineRange(content, 'two'), undefined);
  // Malformed or out of bounds
  for (const bad of ['9-10', '3-2', '1 2', '2-', 'x', '']) {
    assert.equal(expandLineRange(content, bad), undefined);
  }
});

test('read output compaction relativizes paths under the directory only', () => {
  const directory = '/project';
  const v2Header = 'Read file /project/src/app.ts, lines 1-3\n1: a\n2: b\n';
  assert.equal(compactReadOutput(directory, v2Header), 'Read file src/app.ts, lines 1-3\n1: a\n2: b\n');
  const v2NoRange = 'Read file /project/f.txt\n1: x\n';
  assert.equal(compactReadOutput(directory, v2NoRange), 'Read file f.txt\n1: x\n');
  // Paths outside the location keep their absolute form
  const outside = 'Read file /etc/hosts, lines 1-2\n1: x\n';
  assert.equal(compactReadOutput(directory, outside), outside);
  // Unrelated output passes through untouched
  assert.equal(compactReadOutput(directory, 'plain text'), 'plain text');
  assert.equal(compactReadOutput(directory, ''), '');
});

test('legacy V1 read shape is still compacted; directories pass through', () => {
  const directory = '/project';
  const legacy = '<path>/project/f.txt</path>\n<type>file</type>\n1: one\n\n(End of file - total 1 lines)\n';
  assert.equal(compactReadOutput(directory, legacy), '<path>f.txt</path>\n1: one\n');
  const dirOutput = '<type>directory</type>\n<entry>a/</entry>';
  assert.equal(compactReadOutput(directory, dirOutput), dirOutput);
});
