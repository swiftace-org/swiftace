import { assert as is, assertEquals, assertThrows } from "@std/assert";

function isObject(val) {
  return typeof val === "object" && val !== null;
}

const assert = {
  is,
  isObject,
  assertThrows,
  equals: assertEquals,
  throws: assertThrows,
};

export default assert;
