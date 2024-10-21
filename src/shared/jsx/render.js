import assertion from "/shared/assetion/mod.js";

const { assert, isObject } = assertion;

/**
 * Renders an JSX element to a string
 *
 * TODO:
 * - [ ] Add assertions (what are they even?)
 * - [ ] Add props as attributes for text nodes
 * - [ ] Add support for empty tags
 * - [ ] What about props to raw tags not passed as strings?
 * - [ ] Add support for `className` and `htmlFor` ?
 * - [ ] Compare implementation with VHTML ?
 * - [ ] Support dangerouslySetInnerHTML ?
 * - [ ] Handle special cases in attribute setting (e.g. boolean)
 *
 * Reference: https://github.com/dodoas/stringjsx/blob/main/src/stringjsx.js
 */
export function renderToString(jsxElement) {
  // Text element
  if (typeof jsxElement === "string") return escapeForHtml(jsxElement);

  // Array or Fragment
  if (Array.isArray(jsxElement)) return jsxElement.map(renderToString).join("");

  const { type, props } = jsxElement;

  // HTML tag
  if (typeof type === "string") {
    const { children, ...attrs } = props;
    const attrsStr = attrsToString(attrs);
    if (type in VOID_TAGS) {
      // TODO - Throw error if children are passed (?)
      return `<${type} ${attrsStr}>`;
    } else {
      const childrenStr = renderToString(children);
      return `<${type} ${attrsStr}>${childrenStr}</${type}>`;
    }
  }

  // Function component
  if (typeof type === "function") {
    return renderToString(type(props));
  }
}

/**
 * Converts an object of HTML attributes to a string
 * Handles boolean, null, and undefined values correctly
 * Escapes double quotes in values to prevent XSS
 * @param {Object} attrs - HTML attribute key-value pairs
 */
export function attrsToString(attrs) {
  assert(isObject(attrs), `'attrs' must be an object`);
  const result = Object.entries(attrs)
    .map(([key, value]) => {
      assert(isValidAttr(key), `Illegal attribute name: ${key}`);
      if (value === true) return key;
      if (value === false || value === null || value === undefined) return null;
      return `${key}="${value.toString().replace(/"/g, "&quot;")}" `;
    })
    .filter(Boolean)
    .join("");
  assert(typeof result === "string", `'result' must be a string`);
  return result;
}

/** Checks if an attribute name is legal as per the HTML spec */
export function isValidAttr(attrName) {
  assert(typeof attrName === "string", `'attrName' must be a string`);
  // deno-lint-ignore no-control-regex
  const invalidChars = /[ "'>\/= \u0000-\u001F\uFDD0-\uFDEF\uFFFF\uFFFE]/;
  const result = !invalidChars.test(attrName);
  assert(typeof result === "boolean");
  return result;
}

/** HTML nodes that do not have a closing tag */
const VOID_TAGS = [
  "area",
  "base",
  "br",
  "col",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

/**
 * Escapes special characters in a string for safe usage in HTML.
 * Converts &, <, >, ", and ' to their respective HTML entities.
 * Helps prevent XSS (Cross-Site Scripting) attacks when inserting text.
 *
 * @param {string} unsafeText - The string to be escaped
 * @returns {string} The escaped string safe for use in HTML
 */
export function escapeForHtml(unsafeText) {
  assert(typeof unsafeText === "string", "`unsafeText` must be a string");
  const safeText = unsafeText.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });
  assert(typeof safeText === "string", "`safeText` must be a string");
  return safeText;
}
