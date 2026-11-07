// Where `swiftace deploy` puts things on a server.
export const BINARY_PATH = "/usr/local/bin/swiftace"
export const ENV_FILE = "/etc/swiftace.env"
/** The domains the last deploy was for, so later runs can leave them out. */
export const DOMAINS_FILE = "/etc/swiftace.domains"
export const SERVICE_FILE = "/etc/systemd/system/swiftace.service"
export const CADDYFILE = "/etc/caddy/Caddyfile"
