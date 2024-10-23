import { assertEquals, AssertionError, assertThrows } from "@std/assert";

function isObject(val) {
  return typeof val === "object" && val !== null;
}

function is(expr, msg, data = undefined) {
  if (!expr) {
    if (data === undefined) {
      throw new AssertionError(msg);
    }
    const serializer = (_, v) => v === undefined ? "__UNDEFINED__" : v;
    const serializedData = JSON.stringify(data, serializer, 2);
    throw new AssertionError(`${msg}\n${serializedData}\n`);
  }
}

const assert = {
  is,
  isObject,
  assertThrows,
  equals: assertEquals,
  throws: assertThrows,
  AssertionError,
};

export default assert;
