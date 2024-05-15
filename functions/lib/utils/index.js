import { SESv2Client } from "@aws-sdk/client-sesv2";

export function safeguard(handler) {
  return async function (ctx) {
    try {
      const requiredVars = ["SITE_TITLE", "SITE_DESCRIPTION", "SITE_TAGLINE", "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "DB", "CACHE_KV"];
      ensureEnvVars({ env: ctx.env, func: "safeguard", names: requiredVars });
      return await handler(ctx);
    } catch (error) {
      return makeErrorResp({ error, status: 500 });
    }
  };
}

export function makeHtmlResp(element, options) {
  return new Response(element, {
    headers: { "content-type": "text/html;charset=UTF-8", ...options?.headers },
    ...options,
  });
}

export function makeErrorResp({ error, status }) {
  return new Response(`Internal Server Error:\n\n${error.message}\n\n\nStack Trace:\n${error.stack}\n\nPlease send this screenshot to site admins.`, {
    status,
  });
}

export function ensureEnvVars({ env, func, names }) {
  const missing = names.filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`[${func}] ${missing.join(", ")} not configured.`);
}

export function ensureEnvVar({ env, func, name }) {
  if (!env[name]) throw new Error(`[${func}] ${name} not configured.`);
}

export function validateEmail(email) {
  const EMAIL_REGEX = /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

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

export async function validateTurnstile({ env, turnstileToken }) {
  let formData = new FormData();
  formData.append("secret", env.TURNSTILE_SECRET_KEY);
  formData.append("response", turnstileToken);

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(url, {
    body: formData,
    method: "POST",
  });

  const turnstileOutcome = await result.json();
  return turnstileOutcome?.success;
}

export function makeSes({ env }) {
  ensureEnvVars({ env, func: "makeSes", names: ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_FROM_EMAIL"] });
  return new SESv2Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

export const truncateCount = (num) => {
  const convertedNum = Number(num);
  return Math.abs(convertedNum) > 999 ? Math.sign(convertedNum) * parseFloat((Math.abs(convertedNum) / 1000).toFixed(1)) + "k" : convertedNum;
};
