import { describe, it, expect } from "vitest";
import { assert, assertAll, haveSameKeys, isObject, isUrl, isUrlPath, undefinedOrNull } from "./assertion"; // Assuming the function is in assert.js

describe("assert function", () => {
  it("should not throw when check is true", () => {
    expect(() =>
      assert({
        tag: "test",
        check: true,
        error: "Error message",
      })
    ).not.toThrow();
  });

  it("should throw with correct message when check is false", () => {
    expect(() =>
      assert({
        tag: "test",
        check: false,
        error: "Error message",
      })
    ).toThrowError("[test] Error message");
  });

  it("should include data in error message when provided", () => {
    const data = { key: "value" };
    expect(() =>
      assert({
        tag: "test",
        check: false,
        error: "Error message",
        data,
      })
    ).toThrowError(`[test] Error message\n\n${JSON.stringify(data, null, 2)}\n`);
  });

  it("should throw with correct message and serialized input when error is not a string", () => {
    const tag = "test";
    const error = 123;
    expect(() =>
      assert({
        tag,
        check: false,
        error,
      })
    ).toThrowError(`[assert] 'error' must be a string\n${JSON.stringify({ tag, error }, null, 2)}`);
  });
});

describe("assertAll", () => {
  it("should throw an error with all failed assertions", () => {
    const testCase = {
      tag: "TEST",
      asserts: [
        { check: false, error: "Error 1" },
        { check: false, error: "Error 2" },
        { check: true, error: "This should not appear" },
        { check: false, error: "Error 3", data: { key: "value" } },
      ],
    };

    expect(() => assertAll(testCase)).toThrowError(/\[TEST\] Failed assertion\(s\)/);
    expect(() => assertAll(testCase)).toThrowError(/Error 1/);
    expect(() => assertAll(testCase)).toThrowError(/Error 2/);
    expect(() => assertAll(testCase)).toThrowError(/Error 3/);
    expect(() => assertAll(testCase)).toThrowError(/"key": "value"/);
    expect(() => assertAll(testCase)).not.toThrowError(/This should not appear/);
  });

  it("should not throw an error when all assertions pass", () => {
    const testCase = {
      tag: "PASS",
      asserts: [
        { check: true, error: "This should not appear" },
        { check: true, error: "This should not appear either" },
      ],
    };

    expect(() => assertAll(testCase)).not.toThrow();
  });

  it("should handle empty asserts array", () => {
    const testCase = {
      tag: "EMPTY",
      asserts: [],
    };

    expect(() => assertAll(testCase)).not.toThrow();
  });

  it("should handle undefined data", () => {
    const testCase = {
      tag: "UNDEFINED",
      asserts: [{ check: false, error: "Error without data" }],
    };

    expect(() => assertAll(testCase)).toThrowError(/Error without data/);
    expect(() => assertAll(testCase)).not.toThrowError(/undefined/);
  });
});

describe("haveSameKeys", () => {
  it("returns true for objects with the same keys", () => {
    expect(haveSameKeys({ a: 1, b: 2 }, { b: 3, a: 4 })).toBe(true);
  });

  it("returns false for objects with different keys", () => {
    expect(haveSameKeys({ a: 1, b: 2 }, { b: 3, c: 4 })).toBe(false);
  });

  it("returns true for empty objects", () => {
    expect(haveSameKeys({}, {})).toBe(true);
  });
});

describe("undefinedOrNull", () => {
  it("should return true for undefined", () => {
    expect(undefinedOrNull(undefined)).toBe(true);
  });

  it("should return true for null", () => {
    expect(undefinedOrNull(null)).toBe(true);
  });

  it("should return false for everything else", () => {
    expect(undefinedOrNull("")).toBe(false);
    expect(undefinedOrNull(0)).toBe(false);
    expect(undefinedOrNull({})).toBe(false);
    expect(undefinedOrNull([])).toBe(false);
    expect(undefinedOrNull(true)).toBe(false);
    expect(undefinedOrNull(() => {})).toBe(false);
  });
});

describe("isObject", () => {
  it("should return true for plain objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1, b: 34 })).toBe(true);
  });

  it("should return false for non-object values", () => {
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject("string")).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(false)).toBe(false);
  });

  it("should return false for arrays", () => {
    expect(isObject([])).toBe(false);
    expect(isObject([1, 2, 3])).toBe(false);
  });

  it("should return false for functions", () => {
    expect(isObject(function () {})).toBe(false);
    expect(isObject(() => {})).toBe(false);
  });

  it("should return true for objects created with Object.create(null)", () => {
    expect(isObject(Object.create(null))).toBe(true);
  });
});
