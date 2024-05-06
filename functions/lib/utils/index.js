export function safeguard(handler) {
  return async function (ctx) {
    try {
      ensureEnvVars({ env: ctx.env, func: "safeguard", names: ["SITE_TITLE", "SITE_DESCRIPTION", "SITE_TAGLINE"] });
      return handler(ctx);
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
