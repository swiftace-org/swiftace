import { parse } from "./cookie";

export function generateVerificationCode() {
  var vals = new Uint8Array(3);
  crypto.getRandomValues(vals);
  return ((vals[0] & 255) * 100000 + (vals[1] & 255) * 1000 + (vals[2] & 255)).toString().slice(0, 6);
}

export async function hashSessionToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashStr = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashStr;
}

export function getHeaderSessionToken({ request }) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.substring(0, 6) == "Bearer" ? authHeader.substring(6).trim() : "";
  return token;
}

export function getCookieSessionToken({ request }) {
  const cookie = parse(request.headers.get("Cookie") || "");
  return cookie?.SESSION_TOKEN;
}

export function getSessionToken({ request }) {
  return getCookieSessionToken({ request }) ?? getHeaderSessionToken({ request });
}

export async function getCurrentUserId({ request, database }) {
  const token = getSessionToken({ request });
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const session = await database
    .prepare(`SELECT user_id FROM user_sessions WHERE token_hash = ? LIMIT 1;`)
    .bind(tokenHash)
    .first();
  return session?.user_id;
}

export async function getCurrentUser({ request, database }) {
  const token = getSessionToken({ request });
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);

  const query = `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
      CASE WHEN a.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_admin
    FROM user_sessions AS us JOIN users AS u ON us.user_id = u.id
      LEFT JOIN admins AS a ON u.id = a.user_id
    WHERE us.token_hash = ? LIMIT 1;`;
  const user = await database.prepare(query).bind(tokenHash).first();
  return user;
}

export async function getUserEmails({ user, database }) {
  const query = `SELECT email FROM user_emails WHERE user_id = ? LIMIT 10;`;
  const queryOutcome = await database.prepare(query).bind(user.id).all();
  return queryOutcome.results;
}

export function createSessionCookie({ sessionToken, isLocal, maxAge }) {
  return `SESSION_TOKEN=${sessionToken}; Max-Age=${maxAge}; Path="/"; HttpOnly; SameSite=Strict; ${
    isLocal ? "" : "Secure"
  }`;
}

export function createLogoutCookie({ isLocal }) {
  return `SESSION_TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Path="/"; HttpOnly; SameSite=Strict; ${
    isLocal ? "" : "Secure"
  }`;
}

export async function createUserSession({ userId, database }) {
  if (!userId) return;
  const sessionToken = await crypto.randomUUID();
  const sessionTokenHash = await hashSessionToken(sessionToken);
  await database
    .prepare(`INSERT INTO user_sessions (token_hash, user_id) VALUES (?, ?)`)
    .bind(sessionTokenHash, userId)
    .run();
  return { sessionToken };
}

export async function deleteUserSessions({ userId, database }) {
  await database.prepare(`DELETE FROM user_sessions WHERE user_id = ?;`).bind(userId).run();
}

export async function deleteExpiredUserSessions({ userId, database, maxAge }) {
  return database
    .prepare(`DELETE FROM user_sessions WHERE user_id = ? AND created_at < strftime('%s', 'now') - ?;`)
    .bind(userId, maxAge)
    .run();
}

export function validateEmail(email) {
  const EMAIL_REGEX =
    /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

  if (!email) return false;

  const emailParts = email.split("@");

  if (emailParts.length !== 2) return false;

  const account = emailParts[0];
  if (account.length > 64) return false;

  const address = emailParts[1];
  if (address.length > 255) return false;

  const domainParts = address.split(".");
  if (domainParts.some((part) => part.length > 63)) return false;

  return EMAIL_REGEX.test(email);
}
