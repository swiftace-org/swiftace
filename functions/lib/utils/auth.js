import { sign } from "./jwt";

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
