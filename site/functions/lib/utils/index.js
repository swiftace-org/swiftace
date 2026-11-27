import { marked } from "marked";

const renderer = new marked.Renderer();

renderer.checkbox = function (checked) {
  return '<input type="checkbox" ' + (checked ? " checked" : "") + ">";
};

export function parseMarkdown(content) {
  const MARKDOWN_BAD_CHARS = /^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/;
  return marked.parse(content.replace(MARKDOWN_BAD_CHARS, ""), { renderer });
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function makeMetaDescription(text, length = 160) {
  // Finding the end of the first paragraph
  const paragraphEnd = text.indexOf("\n");
  let firstParagraph =
    paragraphEnd > -1 ? text.substring(0, paragraphEnd) : text;

  // Trimming if the paragraph is longer than 160 characters
  if (firstParagraph.length > length) {
    // Finding the last space within the 156 character limit
    const trimEnd = firstParagraph.lastIndexOf(" ", length - 3);
    firstParagraph =
      trimEnd > -1
        ? firstParagraph.substring(0, trimEnd) + "..."
        : firstParagraph;
  }

  return escapeHTML(parseMarkdown(firstParagraph).replace(/<[^>]*>/g, ""));
}
