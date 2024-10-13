import { assert } from "@std/assert";

/**
 * Escapes special characters in a string for safe usage in HTML.
 * Converts &, <, >, ", and ' to their respective HTML entities.
 * Helps prevent XSS (Cross-Site Scripting) attacks when inserting text.
 *
 * @param {string} unsafeString - The string to be escaped
 * @returns {string} The escaped string safe for use in HTML
 */
export function escapeForHtml(unsafeString) {
  assert(typeof unsafeString === "string", "`unsafeString` must be a string");
  return unsafeString.replace(/[&<>"']/g, (match) => {
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
}

export function render(element) {
  // Raw string
  if (typeof element == "string") {
    return escapeForHtml(element);
  }
}
