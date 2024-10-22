import isValidAttr from "/shared/jsx/isValidAttr.js";
import assertion from "/shared/assertion/mod.js";

const { assertEquals, assertThrows } = assertion;

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
