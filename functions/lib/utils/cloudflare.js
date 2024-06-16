import { assert, assertAll, validateUrlOrPath } from "./assert";

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

export function safeguard(handler) {
  return async function (ctx) {
    try {
      const requiredVars = ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "DB", "CACHE_KV", "FILE_STORE"];
      ensureEnvVars({ env: ctx.env, func: "safeguard", names: requiredVars });
      return await handler(ctx);
    } catch (error) {
      return makeErrorResponse({ error, status: 500 });
    }
  };
}

export function makeHtmlResponse(element, options) {
  return new Response(element, {
    headers: { "content-type": "text/html;charset=UTF-8", ...options?.headers },
    ...options,
  });
}

export function makeErrorResponse({ error, status }) {
  return new Response(`Internal Server Error:\n\n${error.stack}\n\nPlease send this screenshot to site admins.`, {
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

export const CachePrefixes = {
  emailVerificationCode: "EMAIL_VERIFICATION_CODE",
  siteSettings: "SITE_SETTINGS",
};

export const FileStorePrefixes = {
  assets: "assets",
};

/**
 * @typedef {Object} SiteSettings
 * @property {string} site_title - The title of the site.
 * @property {string} site_tagline - A short tagline for the site.
 * @property {string} site_description - A longer description of the site for SEO purposes.
 * @property {string} site_favicon_url - The URL to the site's favicon.
 * @property {string} site_logo_url - The URL to the site's logo.
 * @property {string|null} terms_of_service_raw_url - The raw URL to the terms of service document, if any.
 * @property {string|null} privacy_policy_raw_url - The raw URL to the privacy policy document, if any.
 * @property {number} session_expiry_seconds - The duration in seconds after which a session expires.
 * @property {number} otp_expiry_seconds - The duration in seconds after which login verification code expires.
 */

/** @type {SiteSettings} */
const DefaultSiteSettings = {
  site_title: "Site Title",
  site_tagline: "Insert a short tagline here",
  site_description: "Insert a longer description of the site for SEO and link previews, limited to 160 characters for best results.",
  site_favicon_url: "/favicon.ico",
  site_logo_url: "/img/logo.svg",
  terms_of_service_raw_url: null,
  privacy_policy_raw_url: null,
  session_expiry_seconds: 45 * 24 * 60 * 60, // 45 days
  otp_expiry_seconds: 10 * 60, // 10 minutes
};

export async function getSiteSettings({ cacheKv }) {
  const fn = "getSiteSettings";
  assert(fn, typeof cacheKv === "object" && cacheKv != null, "'cacheKv' must be a non-null object");
  assert(fn, typeof cacheKv.get === "function", "'cacheKv' must have a 'get' function");

  const savedSettings = (await cacheKv.get(CachePrefixes.siteSettings, { type: "json" })) ?? {};
  const siteSettings = { ...DefaultSiteSettings, ...savedSettings };

  return siteSettings;
}

export function assertSiteSettings(displayTag, siteSettings, message) {
  assertAll(
    displayTag,
    [
      [typeof siteSettings.site_title === "string" && siteSettings.site_title.trim() !== "", "'site_title' must be a non-empty string"],
      [typeof siteSettings.site_tagline === "string" && siteSettings.site_tagline.trim() !== "", "'site_tagline' must be a non-empty string"],
      [typeof siteSettings.site_description === "string" && siteSettings.site_description.trim() !== "", "'site_description' must be a non-empty string"],
      [validateUrlOrPath(siteSettings.site_favicon_url), "'site_favicon_url' must be a valid URL or path"],
      [validateUrlOrPath(siteSettings.site_logo_url), "'site_logo_url' must be a valid URL or path"],
      [
        siteSettings.terms_of_service_raw_url === null || validateUrlOrPath(siteSettings.terms_of_service_raw_url),
        "'terms_of_service_raw_url' must be null or a valid URL or path",
      ],
      [
        siteSettings.privacy_policy_raw_url === null || validateUrlOrPath(siteSettings.privacy_policy_raw_url),
        "'privacy_policy_raw_url' must be null or a valid URL or path",
      ],
      [
        typeof siteSettings.session_expiry_seconds === "number" && siteSettings.session_expiry_seconds > 0,
        "'session_expiry_seconds' must be a positive number",
      ],
      [typeof siteSettings.otp_expiry_seconds === "number" && siteSettings.otp_expiry_seconds > 0, "'otp_expiry_seconds' must be a positive number"],
    ],
    message
  );
}

export const SiteAssetsKeys = {
  site_favicon: "favicon",
  site_logo: "logo",
  terms_of_service: "terms-of-service",
  privacy_policy: "privacy-policy",
};

export async function uploadSiteAsset({ fileStore, file, name, maxSize }) {
  if (!file) return { url: null };
  if (file.size > maxSize) return { error: `Please upload a file smaller than ${formatBytes(maxSize)}.` };
  const extension = file.name.split(".").pop();
  const key = `${FileStorePrefixes.assets}/${name}`;
  const uploadResult = await fileStore.put(key, file, { httpMetadata: { contentType: file.type }, customMetadata: { extension } });
  const uploadTimestamp = uploadResult.uploaded.getTime();
  return { url: `/assets/${name}.${extension}?t=${uploadTimestamp}` };
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 bytes";
  const k = 1024; // 1 KB is 1024 bytes
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
