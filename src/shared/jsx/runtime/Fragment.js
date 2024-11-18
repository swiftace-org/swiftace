import assert from "shared/assert/@.js";

/** Implements the <> (fragment) tag in JSX */
export default function Fragment(props) {
  assert.is(assert.isObject(props), "'props' must be an object");
  assert.is("children" in props, "'props' must have children");
  return props.children;
}
