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
      const requiredVars = ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "DB", "CACHE_KV"];
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

export const CachePrefix = {
  emailVerificationCode: "EMAIL_VERIFICATION_CODE",
  siteSettings: "SITE_SETTINGS",
};

/**
 * Retrieves site settings from cache, with defaults for any settings not already stored.
 *
 * @returns {Promise<SiteSettings>} A promise that resolves to an object containing site settings.
 */
export async function getSiteSettings({ cacheKv }) {
  const defaultSettings = {
    title: "Site Title",
    tagline: "Insert a short tagline here",
    description: "Insert a longer description of the site for SEO and link previews, limited to 160 characters for best results.",
    faviconUrl: "/favicon.ico",
    logoUrl: "/img/logo.svg",
    metaImageUrl: null,
    termsOfServiceRawUrl: null,
    privacyPolicyRawUrl: null,
    sessionExpiryInSeconds: 45 * 24 * 60 * 60, // 45 days
  };

  const siteSettings = (await cacheKv.get(CachePrefix.siteSettings, { type: "json" })) ?? {};
  return { ...defaultSettings, ...siteSettings };
}

/**
 * @typedef {Object} SiteSettings
 * @property {string} title - The title of the site.
 * @property {string} tagline - A short tagline for the site.
 * @property {string} description - A longer description of the site for SEO purposes, limited to 160 characters.
 * @property {string} faviconUrl - The URL to the site's favicon.
 * @property {string} logoUrl - The URL to the site's logo.
 * @property {string|null} termsOfServiceRawUrl - The raw URL to the terms of service document, if any.
 * @property {string|null} privacyPolicyRawUrl - The raw URL to the privacy policy document, if any.
 * @property {number} sessionExpiryInSeconds - The duration in seconds after which a session expires.
 */
