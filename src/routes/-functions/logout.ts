import { createServerFn } from "@tanstack/react-start"

import { clearAuthCookie } from "@/lib/utils.server"

/** Clearing the cookie is all there is to it — sessions are stateless JWTs. */
export const logout = createServerFn({ method: "POST" }).handler(() => {
  clearAuthCookie()
})
