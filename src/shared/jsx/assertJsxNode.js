import assert from "shared/assert/mod.js";

export default function assertJsxNode(node) {
  assert.is(assert.isObject(node), "'node' must be an object");
  assert.is("type" in node, "'node' must have a 'type' key");
  assert.is(
    typeof node.type === "function" || typeof node.type === "string",
    "'node.type' must be a function or a string",
  );
  assert.is("props" in node, "'node' must have a 'props' key");
  assert.is(
    assert.isObject(node.props),
    "'node.props' must be an object",
  );
  assert.is("key" in node, "'node' must have a 'key' key");
  assert.is(
    node.key === null || typeof node.key === "string",
    "'node.key' must be a string or null",
  );
}
