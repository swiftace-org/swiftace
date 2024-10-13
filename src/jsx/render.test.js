import { assertEquals } from "@std/assert";
import { escapeForHtml } from "./render.js";

Deno.test("escapeForHtml() escapes '&' to '&amp;'", () => {
  assertEquals(escapeForHtml("&"), "&amp;");
});

Deno.test("escapeForHtml() escapes '<' to '&lt;'", () => {
  assertEquals(escapeForHtml("<"), "&lt;");
});

Deno.test("escapeForHtml() escapes '>' to '&gt;'", () => {
  assertEquals(escapeForHtml(">"), "&gt;");
});

Deno.test("escapeForHtml() escapes '\"' to '&quot;'", () => {
  assertEquals(escapeForHtml('"'), "&quot;");
});

Deno.test("escapeForHtml() escapes \"'\" to '&#39;'", () => {
  assertEquals(escapeForHtml("'"), "&#39;");
});

Deno.test("escapeForHtml() handles mixed input", () => {
  const input = 'Tom & Jerry < "quotes" >';
  const escapedOutput = "Tom &amp; Jerry &lt; &quot;quotes&quot; &gt;";
  assertEquals(escapeForHtml(input), escapedOutput);
});

Deno.test("escapeForHtml() escapes XSS attack vectors", () => {
  const xssInput = `<script>alert('XSS')</script>`;
  const escapedOutput = `&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;`;
  assertEquals(escapeForHtml(xssInput), escapedOutput);
});
