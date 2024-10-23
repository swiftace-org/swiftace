import assert from "shared/assert/mod.js";

/** Asserts that the input is a valid JSX element. */
export default function assertJsxObj(element) {
  assert.is(
    assert.isObject(element),
    "'element' must be an object",
    { element },
  );
  assert.is("type" in element, "'element' must have a 'type' key", { element });
  assert.is(
    typeof element.type === "function" || typeof element.type === "string",
    "'element.type' must be a function or a string",
    { type: element.type },
  );
  assert.is(
    "props" in element,
    "'element' must have a 'props' key",
    { element },
  );
  assert.is(
    assert.isObject(element.props),
    "'element.props' must be an object",
    { props: element.props },
  );
  if ("key" in element) {
    assert.is(
      element.key === null || typeof element.key === "string",
      "'element.key' must be a string or null",
      { key: element.key },
    );
  }
}
