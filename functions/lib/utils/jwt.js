if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("SubtleCrypto not supported!");

const algorithms = {
  ES256: { name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" } },
  ES384: { name: "ECDSA", namedCurve: "P-384", hash: { name: "SHA-384" } },
  ES512: { name: "ECDSA", namedCurve: "P-521", hash: { name: "SHA-512" } },
  HS256: { name: "HMAC", hash: { name: "SHA-256" } },
  HS384: { name: "HMAC", hash: { name: "SHA-384" } },
  HS512: { name: "HMAC", hash: { name: "SHA-512" } },
  RS256: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
  RS384: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-384" } },
  RS512: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } },
};

function bytesToByteString(bytes) {
  let byteStr = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    byteStr += String.fromCharCode(bytes[i]);
  }
  return byteStr;
}

function byteStringToBytes(byteStr) {
  let bytes = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64String(arrayBuffer) {
  return btoa(bytesToByteString(new Uint8Array(arrayBuffer)));
}

function base64StringToArrayBuffer(b64str) {
  return byteStringToBytes(atob(b64str)).buffer;
}

function textToArrayBuffer(str) {
  return byteStringToBytes(decodeURI(encodeURIComponent(str)));
}

function arrayBufferToText(arrayBuffer) {
  return bytesToByteString(new Uint8Array(arrayBuffer));
}

function arrayBufferToBase64Url(arrayBuffer) {
  return arrayBufferToBase64String(arrayBuffer).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlToArrayBuffer(b64url) {
  return base64StringToArrayBuffer(b64url.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, ""));
}

function textToBase64Url(str) {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToBinary(pem) {
  return base64StringToArrayBuffer(pem.replace(/-+(BEGIN|END).*/g, "").replace(/\s/g, ""));
}

async function importTextSecret(key, algorithm) {
  return await crypto.subtle.importKey("raw", textToArrayBuffer(key), algorithm, true, ["verify", "sign"]);
}

async function importJwk(key, algorithm) {
  return await crypto.subtle.importKey("jwk", key, algorithm, true, ["verify", "sign"]);
}

async function importPublicKey(key, algorithm) {
  return await crypto.subtle.importKey("spki", pemToBinary(key), algorithm, true, ["verify"]);
}

async function importPrivateKey(key, algorithm) {
  return await crypto.subtle.importKey("pkcs8", pemToBinary(key), algorithm, true, ["sign"]);
}

async function importKey(key, algorithm) {
  if (typeof key === "object") return importJwk(key, algorithm);

  if (typeof key !== "string") throw new Error("Unsupported key type!");

  if (key.includes("PUBLIC")) return importPublicKey(key, algorithm);

  if (key.includes("PRIVATE")) return importPrivateKey(key, algorithm);

  return importTextSecret(key, algorithm);
}

function decodePayload(raw) {
  try {
    const bytes = Array.from(atob(raw), (char) => char.charCodeAt(0));
    const decodedString = new TextDecoder("utf-8").decode(new Uint8Array(bytes));

    return JSON.parse(decodedString);
  } catch {
    return;
  }
}

export async function sign(payload, secret, options = "HS256") {
  if (typeof options === "string") options = { algorithm: options };

  options = { algorithm: "HS256", header: { typ: "JWT" }, ...options };

  if (!payload || typeof payload !== "object") throw new Error("payload must be an object");

  if (!secret || (typeof secret !== "string" && typeof secret !== "object")) throw new Error("secret must be a string or a JWK object");

  if (typeof options.algorithm !== "string") throw new Error("options.algorithm must be a string");

  const algorithm = algorithms[options.algorithm];

  if (!algorithm) throw new Error("algorithm not found");

  if (!payload.iat) payload.iat = Math.floor(Date.now() / 1000);

  const replacer = (_, v) => (typeof v === "bigint" ? `${v}#bigint` : v);

  const partialToken = `${textToBase64Url(JSON.stringify({ ...options.header, alg: options.algorithm }))}.${textToBase64Url(
    JSON.stringify(payload, replacer).replace(/"(-?\d+)#bigint"/g, (_, a) => a)
  )}`;

  const key = await importKey(secret, algorithm);
  const signature = await crypto.subtle.sign(algorithm, key, textToArrayBuffer(partialToken));

  return `${partialToken}.${arrayBufferToBase64Url(signature)}`;
}

export async function verify(
  token,
  secret,
  options = {
    algorithm: "HS256",
    throwError: false,
  }
) {
  if (typeof options === "string") options = { algorithm: options, throwError: false };

  if (!token && !options.throwError) {
    return false;
  }

  options = { algorithm: "HS256", throwError: false, ...options };

  if (typeof token !== "string") throw new Error("Token must be a string");

  if (typeof secret !== "string" && typeof secret !== "object") throw new Error("Secret must be a string or a JWK object");

  if (typeof options.algorithm !== "string") throw new Error("options.algorithm must be a string");

  const tokenParts = token.split(".");

  if (tokenParts.length !== 3) throw new Error("Token must consist of 3 parts");

  const algorithm = algorithms[options.algorithm];

  if (!algorithm) throw new Error("Algorithm not found");

  const { payload } = decode(token);

  try {
    if (!payload) throw new Error("Failed to parse token payload");

    if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) throw new Error("Token is not yet valid");

    if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) throw new Error("Token is expired");

    const key = await importKey(secret, algorithm);

    return await crypto.subtle.verify(algorithm, key, base64UrlToArrayBuffer(tokenParts[2]), textToArrayBuffer(`${tokenParts[0]}.${tokenParts[1]}`));
  } catch (err) {
    if (options.throwError) throw err;

    return false;
  }
}

export function decode(token) {
  return {
    header: decodePayload(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")),
    payload: decodePayload(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
  };
}

export default {
  sign,
  verify,
  decode,
};
