import { createLogoutCookie, deleteUserSessions, getCurrentUserId } from "lib/auth";

export const onGetLogout = async function ({ request, env }) {
  const { DB: database, IS_LOCAL: isLocal } = env;
  const currentUserId = await getCurrentUserId({ request, database });
  await deleteUserSessions({ userId: currentUserId, database });
  return new Response(null, {
    status: 302,
    statusText: "Found",
    headers: { Location: "/login", "Set-Cookie": createLogoutCookie({ isLocal }) },
  });
};
