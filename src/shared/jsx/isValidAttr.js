import assertion from "/shared/assertion/mod.js";

/** Checks if an attribute name is legal as per the HTML spec */
export default function isValidAttr(attrName) {
  assertion.assert(typeof attrName === "string", `'attrName' must be a string`);
  // deno-lint-ignore no-control-regex
  const invalidChars = /[ "'>\/= \u0000-\u001F\uFDD0-\uFDEF\uFFFF\uFFFE]/;
  const result = !invalidChars.test(attrName);
  assertion.assert(typeof result === "boolean");
  return result;
}
