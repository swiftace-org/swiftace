import { describe, it, expect } from "vitest";
import { validateEmail } from "./auth";

describe("validateEmail", () => {
  it("should return true for valid email addresses", () => {
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("user.name+tag+sorting@example.com")).toBe(true);
    expect(validateEmail("user-name@example.co.uk")).toBe(true);
    expect(validateEmail("x@example.com")).toBe(true);
    expect(validateEmail("very.common@example.com")).toBe(true);
  });

  it("should return false for invalid email addresses", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("invalid@")).toBe(false);
    expect(validateEmail("@invalid.com")).toBe(false);
    expect(validateEmail("test@invalid")).toBe(false);
  });

  it("should return false for email addresses with invalid length", () => {
    const longLocalPart = "a".repeat(65) + "@example.com";
    expect(validateEmail(longLocalPart)).toBe(false);
    const longDomain = "test@" + "a".repeat(256) + ".com";
    expect(validateEmail(longDomain)).toBe(false);
    const longSubdomain = "test@" + "a".repeat(64) + ".example.com";
    expect(validateEmail(longSubdomain)).toBe(false);
  });

  it("should handle edge cases", () => {
    expect(validateEmail("test@123.123.123.123")).toBe(false);
    expect(validateEmail("test@[123.123.123.123]")).toBe(false);
    expect(validateEmail("_______@example.com")).toBe(true);
    expect(validateEmail("email@example.com (Joe Smith)")).toBe(false);
    expect(validateEmail("email@-example.com")).toBe(false);
    expect(validateEmail("email@example.com-")).toBe(false);
  });
});
