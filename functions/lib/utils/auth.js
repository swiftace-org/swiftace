import { parse } from "./cookie";
import { decode, sign, verify } from "./jwt";

export function generateVerificationCode() {
  var vals = new Uint8Array(3);
  crypto.getRandomValues(vals);
  return ((vals[0] & 255) * 100000 + (vals[1] & 255) * 1000 + (vals[2] & 255)).toString().slice(0, 6);
}

export async function generateAuthToken({ userId, env }) {
  const payload = {
    identity: { id: userId },
    type: "access",
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 45 * 24 * 60 * 60,
    jti: crypto.randomUUID(),
  };
  const token = await sign(payload, env.JWT_SECRET_KEY);
  return token;
}

export async function getAuthTokenFromHeader({ request }) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.substring(0, 6) == "Bearer" ? authHeader.substring(6).trim() : "";
  return token;
}

export async function getAuthTokenFromCookie({ request }) {
  const cookie = parse(request.headers.get("Cookie") || "");
  return cookie?.AUTH_TOKEN;
}

export async function getCurrentUserId({ request, env }) {
  let token = await getAuthTokenFromCookie({ request });
  if (!token) {
    token = await getAuthTokenFromHeader({ request });
  }
  if (!token) {
    return null;
  }
  const isLoggedIn = await verify(token, env.JWT_SECRET_KEY || "", { algorithm: "HS256", throwError: false });
  const decodedToken = decode(token);
  return isLoggedIn ? decodedToken.payload?.identity?.id : null;
}
