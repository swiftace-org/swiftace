export async function makeHtmlResp(element, options) {
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
