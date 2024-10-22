import assertion from "/shared/assertion/mod.js";

/**
 * Escapes special characters in a string for safe usage in HTML.
 * Converts &, <, >, ", and ' to their respective HTML entities.
 * Helps prevent XSS (Cross-Site Scripting) attacks when inserting text.
 *
 * @param {string} unsafeText - The string to be escaped
 * @returns {string} The escaped string safe for use in HTML
 */
export default function escapeForHtml(unsafeText) {
  assertion.assert(
    typeof unsafeText === "string",
    "`unsafeText` must be a string",
  );
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
  assertion.assert(typeof safeText === "string", "`safeText` must be a string");
  return safeText;
}
