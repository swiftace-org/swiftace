import { describe, it, expect } from "vitest";
import {
  assert,
  assertAll,
  assertEnvKeys,
  haveSameKeys,
  isNonEmptyString,
  isObject,
  isValidEmail,
  undefinedOrNull,
} from "./assertion"; // Assuming the function is in assert.js

describe("assert", () => {
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

describe("isNonEmptyString", () => {
  it("returns true for non-empty strings", () => {
    expect(isNonEmptyString("hello")).toBe(true);
    expect(isNonEmptyString(" ")).toBe(true);
  });

  it("returns false for empty strings, non-strings, and null/undefined", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString([])).toBe(false);
    expect(isNonEmptyString({})).toBe(false);
  });

  it("trims strings when trim option is true", () => {
    expect(isNonEmptyString("  hello  ", { trim: true })).toBe(true);
    expect(isNonEmptyString("   ", { trim: true })).toBe(false);
  });
});

describe("assertEnvKeys", () => {
  it("should not throw when all keys are present in env", () => {
    const env = { KEY1: "value1", KEY2: "value2" };
    const keys = ["KEY1", "KEY2"];
    expect(() => assertEnvKeys({ tag: "test", env, keys })).not.toThrow();
  });

  it("should throw when env is not an object", () => {
    expect(() => assertEnvKeys({ tag: "test", env: "not an object", keys: [] })).toThrow(
      "'env' must be an object"
    );
  });

  it("should throw when keys is not an array of strings", () => {
    const env = {};
    expect(() => assertEnvKeys({ tag: "test", env, keys: "not an array" })).toThrow(
      "'keys' must be an array of strings"
    );
    expect(() => assertEnvKeys({ tag: "test", env, keys: [1, 2, 3] })).toThrow(
      "'keys' must be an array of strings"
    );
  });

  it("should throw when some keys are missing from env", () => {
    const env = { KEY1: "value1" };
    const keys = ["KEY1", "KEY2"];
    expect(() => assertEnvKeys({ tag: "test", env, keys })).toThrow("Environment variable(s) not configured");
  });
});

describe("isValidEmail", () => {
  it("returns true for valid email addresses", () => {
    const validEmails = [
      "test@example.com",
      "user.name+tag+sorting@example.com",
      "user-name@example.co.uk",
      "1234567890@example.com",
      "email@example-one.com",
      "_______@example.com",
    ];

    validEmails.forEach((email) => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  it("returns false for invalid email addresses", () => {
    const invalidEmails = [
      "plainaddress",
      "@missingusername.com",
      "username@.com",
      "username@.com.",
      ".username@example.com",
      "username@example..com",
      "username@example.com@example.com",
      "username@example",
      "username@-example.com",
      "username@exam_ple.com",
      "user name@example.com",
      "username@example.com.",
    ];

    invalidEmails.forEach((email) => {
      expect(isValidEmail(email)).toBe(false);
    });
  });

  it("handles edge cases correctly", () => {
    // Empty input
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);

    // Max length of local part (64 characters)
    const maxLengthLocalPart = "a".repeat(64);
    expect(isValidEmail(`${maxLengthLocalPart}@example.com`)).toBe(true);
    expect(isValidEmail(`${maxLengthLocalPart}x@example.com`)).toBe(false);

    // Max length of address part (255 characters)
    const maxLengthDomain = "a".repeat(63);
    const longDomain = `${maxLengthDomain}.${maxLengthDomain}.${maxLengthDomain}.${maxLengthDomain}`;
    expect(isValidEmail(`test@${longDomain}`)).toBe(true);
    expect(isValidEmail(`test@${longDomain}x`)).toBe(false);

    // Max length of a domain part (63 characters)
    expect(isValidEmail(`test@${maxLengthDomain}.com`)).toBe(true);
    expect(isValidEmail(`test@${maxLengthDomain}x.com`)).toBe(false);

    // Valid email with very long total length (more than 255 characters)
    const veryLongEmail =
      "a".repeat(64) + "@" + "b".repeat(63) + "." + "d".repeat(63) + "." + "e".repeat(63) + ".com";
    expect(isValidEmail(veryLongEmail)).toBe(true);
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

  it("throws an error when first argument is not an object", () => {
    expect(() => haveSameKeys(null, {})).toThrow("[haveSameKeys] 'input1' must be an object");
    expect(() => haveSameKeys([], {})).toThrow("[haveSameKeys] 'input1' must be an object");
    expect(() => haveSameKeys("string", {})).toThrow("[haveSameKeys] 'input1' must be an object");
  });

  it("throws an error when second argument is not an object", () => {
    expect(() => haveSameKeys({}, null)).toThrow("[haveSameKeys] 'input2' must be an object");
    expect(() => haveSameKeys({}, [])).toThrow("[haveSameKeys] 'input2' must be an object");
    expect(() => haveSameKeys({}, 42)).toThrow("[haveSameKeys] 'input2' must be an object");
  });
});
