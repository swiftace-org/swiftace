import { createLogoutCookie } from "lib/utils/auth";

export async function onRequestGet({ env }) {
  return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/", "Set-Cookie": createLogoutCookie({ env }) } });
}
