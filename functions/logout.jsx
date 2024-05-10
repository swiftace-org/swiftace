export async function onRequestGet({ env }) {
  const authCookie = `AUTH_TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Path="/"; ${env.LOCAL ? "" : "Secure"}`;
  return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/", "Set-Cookie": authCookie } });
}
