import { createLogoutCookie, deleteUserSessions } from "lib/utils/auth";

export async function onRequestGet({ request, env }) {
  await deleteUserSessions({ request, env });
  return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/login", "Set-Cookie": createLogoutCookie({ env }) } });
}
