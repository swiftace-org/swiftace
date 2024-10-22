import attrsToString from "/shared/jsx/attrsToString.js";
import assertion from "/shared/assertion/mod.js";

const { assertEquals } = assertion;

Deno.test("attrsToString() handles basic key-value pairs", () => {
  const input = { id: "test", class: "example" };
  const expected = 'id="test" class="example" ';
  assertEquals(attrsToString(input), expected);
});
