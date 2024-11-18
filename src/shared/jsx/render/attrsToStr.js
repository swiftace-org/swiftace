import assert from "shared/assert/@.js";
import render from "shared/jsx/render/@.js";

/**
 * Converts an object of HTML attributes to a string
 * Handles boolean, null, and undefined values
 * Escapes double quotes in values to prevent XSS
 * @param {Object} attrs - HTML attribute key-value pairs
 */
export default function attrsToStr(attrs) {
  assert.is(assert.isObject(attrs), `'attrs' must be an object`);
  const result = Object.entries(attrs)
    .map(([key, value]) => {
      assert.is(render.isValidAttr(key), `Illegal attribute name: ${key}`);
      if (value === true) return ` ${key}`;
      if (value === false || value === null || value === undefined) return null;
      return ` ${key}="${value.toString().replace(/"/g, "&quot;")}"`;
    })
    .filter(Boolean)
    .join("");
  assert.is(typeof result === "string", `'result' must be a string`);
  return result;
}
