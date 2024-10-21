import assertion from "/shared/assetion/mod.js";
import { attrsToString, escapeForHtml, isValidAttr } from "./render.js";

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

Deno.test("attrsToString() handles basic key-value pairs", () => {
  const input = { id: "test", class: "example" };
  const expected = 'id="test" class="example" ';
  assertEquals(attrsToString(input), expected);
});

Deno.test("isValidAttr() valid attribute names", () => {
  const IS_VALID = true;
  assertEquals(isValidAttr("data-value"), IS_VALID);
  assertEquals(isValidAttr("aria-hidden"), IS_VALID);
  assertEquals(isValidAttr("customAttr"), IS_VALID);
});

Deno.test("isValidAttr() invalid attribute names", () => {
  const NOT_VALID = false;
  assertEquals(isValidAttr('data"val'), NOT_VALID);
  assertEquals(isValidAttr("invalid>attr"), NOT_VALID);
  assertEquals(isValidAttr("attr with space"), NOT_VALID);
  assertEquals(isValidAttr("attr/equals="), NOT_VALID);
});

Deno.test("isValidAttr() throws error for non-string input", () => {
  const msg = "'attrName' must be a string";
  assertThrows(() => isValidAttr(123), Error, msg);
  assertThrows(() => isValidAttr(null), Error, msg);
});
