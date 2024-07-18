import { assert, assertAll, assertAllOld, isNonEmptyString, isUrlOrPath } from "./validation";
import { CachePrefix } from "./constants";

export async function validateTurnstile({ turnstileSecretKey, turnstileToken }) {
  let formData = new FormData();
  formData.append("secret", turnstileSecretKey);
  formData.append("response", turnstileToken);

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(url, {
    body: formData,
    method: "POST",
  });

  const turnstileOutcome = await result.json();
  return turnstileOutcome?.success;
}

export function makeHtmlResponse(element, options) {
  return new Response(element, {
    headers: { "content-type": "text/html;charset=UTF-8", ...options?.headers },
    ...options,
  });
}

export function makeErrorResponse({ error, status }) {
  return new Response(
    `Internal Server Error:\n\n${error.stack}\n\nPlease send this screenshot to site admins.`,
    {
      status,
    }
  );
}

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
  site_description:
    "Insert a longer description of the site for SEO and link previews, limited to 160 characters for best results.",
  site_favicon_url: "/favicon.ico",
  site_logo_url: "/img/logo.svg",
  terms_of_service_raw_url: null,
  privacy_policy_raw_url: null,
  session_expiry_seconds: 45 * 24 * 60 * 60, // 45 days
  otp_expiry_seconds: 10 * 60, // 10 minutes
};

export async function getSiteSettings({ kvStore }) {
  const tag = "getSiteSettings";

  assert({
    tag,
    check: typeof kvStore === "object" && kvStore != null,
    error: "'kvStore' must be a non-null object",
  });

  assert({
    tag,
    check: typeof kvStore.get === "function",
    error: "'kvStore' must have a 'get' function",
  });

  const savedSettings = (await kvStore.get(CachePrefix.SITE_SETTINGS, { type: "json" })) ?? {};
  const siteSettings = { ...DefaultSiteSettings, ...savedSettings };

  return siteSettings;
}

export async function uploadFile({ fileStore, file, key, maxSize = null }) {
  if (!file) return { url: null };
  if (maxSize && file.size > maxSize)
    return { error: `Please upload a file smaller than ${formatBytes(maxSize)}` };
  const extension = file.name.split(".").pop();
  const uploadResult = await fileStore.put(key, file, {
    httpMetadata: { contentType: file.type },
    customMetadata: { extension },
  });
  const uploadTimestamp = uploadResult.uploaded.getTime();
  return { url: `/files/${key}.${extension}?t=${uploadTimestamp}` };
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 bytes";
  const k = 1024; // 1 KB is 1024 bytes
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
