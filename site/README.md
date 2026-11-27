# swiftace.org

The website at [swiftace.org](https://swiftace.org). It is a Bun server: the pages in
`functions/` render the HTML, and `public/` is served as static files. It used to be a
Cloudflare Pages project; the pages are unchanged, so the HTML is the same.
Cloudflare's email obfuscation and Web Analytics beacon were added at the edge, not by
the site, so this server does not include them. They don't change how the pages look.

## Run

From this directory, with [Bun](https://bun.sh):

```sh
bun install
bun server.js
```

It listens on `127.0.0.1:2001`. `HOST` and `PORT` override that. Run it from this directory,
or pass `--tsconfig-override` pointing at `tsconfig.json` here: the pages' JSX only renders
as HTML with that config.

`/install.sh` redirects to the latest `install.sh` on the [GitHub release](https://github.com/swiftace-org/swiftace/releases/latest),
from the rule in `public/_redirects`.

## Deploy

On a Linux server with [Caddy](https://caddyserver.com/docs/install) and Bun on `PATH` as
`/usr/local/bin/bun`:

```sh
sudo mkdir -p /opt/swiftace.org
sudo cp -a . /opt/swiftace.org/
sudo chmod -R a+rX /opt/swiftace.org
cd /opt/swiftace.org && bun install --production
sudo cp swiftace.org.service /etc/systemd/system/
sudo systemctl enable --now swiftace.org
```

`Caddyfile` is the site block. If `/etc/caddy/Caddyfile` already has other sites, paste the
block in; otherwise install this file and reload Caddy:

```sh
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

The service listens on `127.0.0.1:2001`, which the Caddyfile proxies. Change both together.
DNS for `swiftace.org` points at the server; Caddy gets the certificate.
