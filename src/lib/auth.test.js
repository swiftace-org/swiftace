import { describe, it, expect, beforeAll } from "vitest";
import {
  generateVerificationCode,
  getCookieSessionToken,
  getCurrentUser,
  getCurrentUserId,
  getHeaderSessionToken,
  getSessionToken,
  getUserEmails,
  hashSessionToken,
} from "./auth";

import { createSQLiteDB } from "@miniflare/shared";
import { D1Database, D1DatabaseAPI } from "@miniflare/d1";

describe("generateVerificationCode", () => {
  it("generates a 6-digit verification code", () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes on subsequent calls", () => {
    const code1 = generateVerificationCode();
    const code2 = generateVerificationCode();
    expect(code1).not.toBe(code2);
  });
});

describe("hashSessionToken", () => {
  it("should hash a valid token correctly", async () => {
    const token = "validToken123";
    const hash = await hashSessionToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should throw an error for invalid inputs", async () => {
    const errorMessage = "Token must be a non-empty string";

    await expect(hashSessionToken("  ")).rejects.toThrow(errorMessage);
    await expect(hashSessionToken(null)).rejects.toThrow(errorMessage);
    await expect(hashSessionToken(undefined)).rejects.toThrow(errorMessage);
    await expect(hashSessionToken(123)).rejects.toThrow(errorMessage);
    await expect(hashSessionToken({})).rejects.toThrow(errorMessage);
  });

  it("should produce consistent hashes for the same input", async () => {
    const token = "consistentToken456";
    const hash1 = await hashSessionToken(token);
    const hash2 = await hashSessionToken(token);
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different inputs", async () => {
    const token1 = "uniqueToken1";
    const token2 = "uniqueToken2";
    const hash1 = await hashSessionToken(token1);
    const hash2 = await hashSessionToken(token2);
    expect(hash1).not.toBe(hash2);
  });
});

describe("getHeaderSessionToken", () => {
  it("extracts Bearer token correctly", () => {
    const headers = new Headers({ Authorization: "Bearer token123" });
    expect(getHeaderSessionToken(headers)).toBe("token123");
  });

  it("returns empty string for non-Bearer tokens and missing Authorization header", () => {
    const headers1 = new Headers({ Authorization: "Basic abc123" });
    const headers2 = new Headers();

    expect(getHeaderSessionToken(headers1)).toBe("");
    expect(getHeaderSessionToken(headers2)).toBe("");
  });

  it("throws an error for invalid requestHeaders", () => {
    expect(() => getHeaderSessionToken({})).toThrow("'headers' must have a valid 'get' method");
    expect(() => getHeaderSessionToken(null)).toThrow("'headers' must have a valid 'get' method");
  });
});

describe("getCookieSessionToken", () => {
  it("returns the SESSION_TOKEN from the Cookie header", () => {
    const headers = new Headers();
    headers.set("Cookie", "some=value1; SESSION_TOKEN=abc123; other=value");
    expect(getCookieSessionToken(headers)).toBe("abc123");
  });

  it("returns undefined when SESSION_TOKEN is not present", () => {
    const headers = new Headers();
    headers.set("Cookie", "other=value");
    expect(getCookieSessionToken(headers)).toBeUndefined();
  });

  it("returns undefined when Cookie header is empty", () => {
    const headers = new Headers();
    headers.set("Cookie", "");
    expect(getCookieSessionToken(headers)).toBeUndefined();
  });

  it("returns undefined when Cookie header is not set", () => {
    const headers = new Headers();
    expect(getCookieSessionToken(headers)).toBeUndefined();
  });

  it("throws an error if requestHeaders doesn't have a get method", () => {
    expect(() => getCookieSessionToken({})).toThrow("'headers' must have a valid 'get' method");
  });
});

describe("getSessionToken", () => {
  it("returns cookie session token when available", () => {
    const headers = new Headers();
    headers.set("Cookie", "SESSION_TOKEN=cookie-token");
    expect(getSessionToken(headers)).toBe("cookie-token");
  });

  it("returns header session token when cookie token is not available", () => {
    const headers = new Headers();
    headers.set("Authorization", "Bearer header-token");
    expect(getSessionToken(headers)).toBe("header-token");
  });

  it("returns empty string when both cookie and header tokens are not available", () => {
    const headers = new Headers();
    expect(getSessionToken(headers)).toBe("");
  });

  it("prioritizes cookie token over header token when both are available", () => {
    const headers = new Headers();
    headers.set("Cookie", "SESSION_TOKEN=cookie-token");
    headers.set("Authorization", "Bearer header-token");
    expect(getSessionToken(headers)).toBe("cookie-token");
  });
});

describe("getCurrentUserId", () => {
  let database;
  const validToken1 = "valid_token";
  const userId = 23;

  beforeAll(async () => {
    database = new D1Database(new D1DatabaseAPI(await createSQLiteDB(":memory:")));
    await database
      .prepare(
        `CREATE TABLE user_sessions (
          token_hash TEXT PRIMARY KEY NOT NULL, 
          user_id INTEGER NOT NULL
        );`
      )
      .run();
    const tokenHash = await hashSessionToken(validToken1);
    await database
      .prepare("INSERT INTO user_sessions (token_hash, user_id) VALUES (?, ?)")
      .bind(tokenHash, userId)
      .run();
  });

  it("returns null when no session token is present", async () => {
    const request = { headers: new Headers() };
    const result = await getCurrentUserId({ request, database });
    expect(result).toBeUndefined();
  });

  it("returns user_id when a valid session token is present", async () => {
    const request = { headers: new Headers({ Authorization: `Bearer ${validToken1}` }) };
    const result = await getCurrentUserId({ request, database });
    expect(result).toBe(userId);
  });

  it("returns null when the session token is not found in database", async () => {
    const invalidToken = "invalid_token";
    const request = { headers: new Headers({ Authorization: `Bearer ${invalidToken}` }) };
    const result = await getCurrentUserId({ request, database: database });
    expect(result).toBeUndefined();
  });
});

describe("getCurrentUser", () => {
  let database;
  const validToken1 = "validToken1";
  const validToken2 = "validToken2";

  beforeAll(async () => {
    database = new D1Database(new D1DatabaseAPI(await createSQLiteDB(":memory:")));
    const validToken1Hash = await hashSessionToken(validToken1);
    const validToken2Hash = await hashSessionToken(validToken2);

    await database.batch([
      database.prepare(
        `CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          first_name TEXT,
          last_name TEXT,
          avatar_url TEXT
        );`
      ),
      database.prepare(
        `CREATE TABLE user_sessions (
          token_hash TEXT PRIMARY KEY,
          user_id INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );`
      ),
      database.prepare(
        `CREATE TABLE admins (
          user_id INTEGER PRIMARY KEY,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );`
      ),
      database.prepare(
        `INSERT INTO users (id, first_name, last_name, avatar_url) VALUES
          (1, 'John', 'Doe', 'avatar1.png'),
          (2, 'Jane', 'Smith', 'avatar2.png');`
      ),
      database
        .prepare(
          `INSERT INTO user_sessions (token_hash, user_id) VALUES
          (?, 1),
          (?, 2);`
        )
        .bind(validToken1Hash, validToken2Hash),
      database.prepare(
        `INSERT INTO admins (user_id) VALUES
        (1);`
      ),
    ]);
  });

  it("should return user data for a valid token (admin user)", async () => {
    const headers = new Headers();
    headers.set("Authorization", "Bearer validToken1");
    const request = { headers };
    const user = await getCurrentUser({ request, database });
    expect(user).toEqual({
      id: 1,
      first_name: "John",
      last_name: "Doe",
      avatar_url: "avatar1.png",
      is_admin: 1,
    });
  });

  it("should return user data for a valid token (non-admin user)", async () => {
    const headers = new Headers();
    headers.set("Authorization", "Bearer validToken2");
    const request = { headers };
    const user = await getCurrentUser({ request, database });
    expect(user).toEqual({
      id: 2,
      first_name: "Jane",
      last_name: "Smith",
      avatar_url: "avatar2.png",
      is_admin: 0,
    });
  });

  it("should return null for an invalid token", async () => {
    const headers = new Headers();
    headers.set("Authorization", "Bearer invalidToken");
    const request = { headers };
    const user = await getCurrentUser({ request, database });
    expect(user).toBeNull();
  });

  it("should return null if no token is provided", async () => {
    const request = { headers: new Headers() };
    const user = await getCurrentUser({ request, database });
    expect(user).toBeNull();
  });
});

describe("getUserEmails", () => {
  let database;
  beforeAll(async () => {
    database = new D1Database(new D1DatabaseAPI(await createSQLiteDB(":memory:")));
    database.batch([
      database.prepare(`
        CREATE TABLE user_emails (
        email TEXT PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );`),
      database.prepare(
        `INSERT INTO user_emails (email, user_id) VALUES
          ('test1@example.com', 1),
          ('test2@example.com', 1),
          ('test3@example.com', 2),
          ('test4@example.com', 2),
          ('test5@example.com', 2);`
      ),
    ]);
  });

  it("should return user emails for a give user id", async () => {
    const result = await getUserEmails({ userId: 1, database });
    expect(result).toEqual([{ email: "test1@example.com" }, { email: "test2@example.com" }]);
  });

  it("should return an empty array if the user has no emails", async () => {
    const result = await getUserEmails({ userId: 3, database });
    expect(result).toEqual([]);
  });

  it("should limit the number of results to the given limit", async () => {
    const result = await getUserEmails({ userId: 2, database, limit: 2 });
    expect(result).toEqual([{ email: "test3@example.com" }, { email: "test4@example.com" }]);
  });

  it("should throw if 'userId' is not a postive integer", async () => {
    const message = "'userId' must be a positive integer";
    await expect(getUserEmails({ database })).rejects.toThrow(message);
    await expect(getUserEmails({ userId: 0, database })).rejects.toThrow(message);
    await expect(getUserEmails({ userId: -1, database })).rejects.toThrow(message);
    await expect(getUserEmails({ userId: 1.5, database })).rejects.toThrow(message);
    await expect(getUserEmails({ userId: "hello", database })).rejects.toThrow(message);
  });

  it("should throw if 'database' does not have a valid 'prepare' method", async () => {
    const message = "'database' must have a valid 'prepare' method";
    await expect(getUserEmails({ userId: 1 })).rejects.toThrow(message);
    await expect(getUserEmails({ userId: 1, database: { exec: () => {} } })).rejects.toThrow(message);
  });
});
