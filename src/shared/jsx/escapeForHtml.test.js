import escapeForHtml from "/shared/jsx/escapeForHtml.js";
import assertion from "/shared/assertion/mod.js";

const { assertEquals, assertThrows } = assertion;

Deno.test("escapeForHtml() escapes &, <, >, \", and '", () => {
  const input = 'Tom & Jerry\'s < "quotes" >';
  const escapedOutput = "Tom &amp; Jerry&#39;s &lt; &quot;quotes&quot; &gt;";
  assertEquals(escapeForHtml(input), escapedOutput);
});

Deno.test("escapeForHtml() escapes XSS attack vectors", () => {
  const xssInput = `<script>alert('XSS')</script>`;
  const escapedOutput = `&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;`;
  assertEquals(escapeForHtml(xssInput), escapedOutput);
});

Deno.test("escapeForHtml() throws error for non-string input", () => {
  const message = "`unsafeText` must be a string";
  assertThrows(() => escapeForHtml(123), Error, message);
  assertThrows(() => escapeForHtml(null), Error, message);
  assertThrows(() => escapeForHtml(undefined), Error, message);
  assertThrows(() => escapeForHtml({}), Error, message);
});
