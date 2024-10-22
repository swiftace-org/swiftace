import assert from "shared/assert/mod.js";

/**
 * Creates a JSX element with zero or one children
 * @param {string | Function} type - HTML tag or component function
 * @param {Object} props - Key-value pairs of props (including children)
 * @param {string} key - Unique key for the element
 */
export default function jsx(type, props, key = null) {
  assert.is(
    typeof type === "string" || typeof type === "function",
    "'type' must be a string or function",
  );
  assert.is(assert.isObject(props), "'props' must be an object");
  assert.is(
    key === null || typeof key === "string",
    "'key' must be a string or null",
  );
  return {
    type,
    props,
    key,
  };
}
