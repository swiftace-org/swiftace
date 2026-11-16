// Where `swiftace deploy` puts things on a server.
export const BINARY_PATH = "/usr/local/bin/swiftace"
export const ENV_FILE = "/etc/swiftace.env"
/** The domains the last deploy was for, so later runs can leave them out. */
export const DOMAINS_FILE = "/etc/swiftace.domains"
export const SERVICE_FILE = "/etc/systemd/system/swiftace.service"
export const CADDYFILE = "/etc/caddy/Caddyfile"
export const UPDATE_SERVICE_FILE = "/etc/systemd/system/swiftace-update.service"
export const UPDATE_PATH_FILE = "/etc/systemd/system/swiftace-update.path"
export const UPDATE_TIMER_FILE = "/etc/systemd/system/swiftace-update.timer"
/**
 * The service's StateDirectory as root sees it: with DynamicUser, systemd keeps it here and only
 * links /var/lib/swiftace to it once the service has started.
 */
export const STATE_DIR = "/var/lib/private/swiftace"
