import { createLogoutCookie, deleteUserSessions, getCurrentUserId } from "lib/utils/auth";
import { safeguard } from "lib/utils/cloudflare";

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { DB: database, IS_LOCAL: isLocal } = env;
  const currentUserId = await getCurrentUserId({ request, database });
  console.log({ currentUserId });
  await deleteUserSessions({ userId: currentUserId, database });
  return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/login", "Set-Cookie": createLogoutCookie({ isLocal }) } });
});
