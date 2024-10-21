import { assert, assertEquals, assertThrows } from "@std/assert";

function isObject(val) {
  return typeof val === "object" && val !== null;
}

const assertion = {
  assert,
  isObject,
  assertThrows,
  assertEquals,
};

export default assertion;
