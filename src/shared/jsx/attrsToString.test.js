import attrsToString from "/shared/jsx/attrsToString.js";
import assertion from "/shared/assertion/mod.js";

const { assertEquals, assertThrows } = assertion;

Deno.test("attrsToString() handles empty object", () => {
  const input = {};
  const expected = "";
  assertEquals(attrsToString(input), expected);
});

Deno.test("attrsToString() handles basic key-value pairs", () => {
  const input = { id: "test", class: "example" };
  const expected = ' id="test" class="example"';
  assertEquals(attrsToString(input), expected);
});

Deno.test("attrsToString() handles boolean attributes", () => {
  const input = { disabled: true, checked: false };
  const expected = " disabled";
  assertEquals(attrsToString(input), expected);
});

Deno.test("attrsToString() handles null and undefined values", () => {
  const input = { id: "test", class: null, style: undefined };
  const expected = ' id="test"';
  assertEquals(attrsToString(input), expected);
});

Deno.test("attrsToString() escapes double quotes in values", () => {
  const input = { title: 'He said "Hello"' };
  const expected = ' title="He said &quot;Hello&quot;"';
  assertEquals(attrsToString(input), expected);
});

Deno.test("attrsToString() handles mixed attribute types", () => {
  const input = {
    id: "test",
    disabled: true,
    class: null,
    title: 'He said "Hello"',
  };
  const expected = ' id="test" disabled title="He said &quot;Hello&quot;"';
  assertEquals(attrsToString(input), expected);
});

Deno.test("attrsToString() rejects illegal attribute names", () => {
  const input = { "illegal>attr": "value" };
  const msg = "Illegal attribute name: illegal-attr";
  assertThrows(() => attrsToString(input), msg);
});

Deno.test("attrsToString() rejects non-object input", () => {
  const input = "test";
  const msg = "'attrs' must be an object";
  assertThrows(() => attrsToString(input), msg);
});
