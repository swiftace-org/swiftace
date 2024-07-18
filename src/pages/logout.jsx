import { createLogoutCookie, deleteUserSessions, getCurrentUserId } from "lib/auth";
import { EnvKeys } from "lib/constants";

export const onGetLogout = async function ({ request, env, database }) {
  const currentUserId = await getCurrentUserId({ request, database });
  await deleteUserSessions({ userId: currentUserId, database });
  return new Response(null, {
    status: 302,
    statusText: "Found",
    headers: { Location: "/login", "Set-Cookie": createLogoutCookie({ isLocal: env[EnvKeys.isLocal] }) },
  });
};
