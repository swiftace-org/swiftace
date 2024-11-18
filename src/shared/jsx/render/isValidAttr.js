import assert from "shared/assert/@.js";

/** Checks if an attribute name is legal as per the HTML spec */
export default function isValidAttr(attrName) {
  assert.is(typeof attrName === "string", `'attrName' must be a string`);
  // deno-lint-ignore no-control-regex
  const invalidChars = /[ "'>\/= \u0000-\u001F\uFDD0-\uFDEF\uFFFF\uFFFE]/;
  const result = !invalidChars.test(attrName);
  assert.is(typeof result === "boolean");
  return result;
}
