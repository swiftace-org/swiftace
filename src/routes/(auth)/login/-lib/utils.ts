/**
 * `a•••@example.com` — enough for someone to recognize their own address on the verify page,
 * not enough to hand somebody else's over to whoever turns up holding the `state` token.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@")
  if (at <= 0) return "•••"

  const [local, domain] = [email.slice(0, at), email.slice(at)]
  return local.length <= 1 ? `${local}•••${domain}` : `${local[0]}•••${domain}`
}
