#!/bin/sh
# Installs SwiftAce (https://github.com/swiftace-org/swiftace) on Linux or macOS:
#
#   curl -fsSL https://github.com/swiftace-org/swiftace/releases/latest/download/install.sh | sh
#
# Downloads the latest release for this machine, checks it against the release's SHA256SUMS, and
# installs it at /usr/local/bin/swiftace, with sudo if that folder needs it. Running it again
# upgrades (as does `swiftace upgrade`). On a server, run `sudo swiftace deploy` next. Settings, as
# environment variables:
#
#   SWIFTACE_VERSION      install this version instead of the latest (e.g. 0.1.2)
#   SWIFTACE_INSTALL_DIR  install here instead of /usr/local/bin
set -eu

repo="https://github.com/swiftace-org/swiftace"
# Where releases are published, as for `swiftace upgrade`. install.test.ts points it at fake ones.
releases="${SWIFTACE_RELEASES_URL:-$repo/releases}"
releases="${releases%/}"
dir="${SWIFTACE_INSTALL_DIR:-/usr/local/bin}"

fail() {
  printf 'swiftace install: %s\n' "$*" >&2
  exit 1
}

case "$(uname -s)" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *) fail "there's no SwiftAce build for $(uname -s); see $repo" ;;
esac

case "$(uname -m)" in
  arm64 | aarch64) arch=arm64 ;;
  x86_64 | amd64) arch=x64 ;;
  *) fail "there's no SwiftAce build for $(uname -m) processors; see $repo" ;;
esac

# A shell running under Rosetta reports x86_64 on Apple Silicon Macs.
if [ "$os-$arch" = darwin-x64 ] && [ "$(sysctl -n sysctl.proc_translated 2> /dev/null)" = 1 ]; then
  arch=arm64
fi

# The Linux builds need glibc, which Alpine and some other small distributions don't have.
if [ "$os" = linux ] && ldd --version 2>&1 | grep -qi musl; then
  fail "SwiftAce needs a Linux with glibc (like Debian or Ubuntu), not musl"
fi

command -v curl > /dev/null || fail "curl is needed to download SwiftAce"

binary="swiftace-$os-$arch"
if [ -n "${SWIFTACE_VERSION:-}" ]; then
  url="$releases/download/v${SWIFTACE_VERSION#v}"
else
  url="$releases/latest/download"
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "Downloading $url/$binary..."
curl -fsSL "$url/SHA256SUMS" -o "$tmp/SHA256SUMS" || fail "couldn't download $url/SHA256SUMS"
expected=$(awk -v name="$binary" '$2 == name || $2 == "*" name { print $1 }' "$tmp/SHA256SUMS")
[ -n "$expected" ] || fail "the release's SHA256SUMS doesn't list $binary"
curl -fsSL "$url/$binary" -o "$tmp/swiftace" || fail "couldn't download $url/$binary"

if command -v sha256sum > /dev/null; then
  actual=$(sha256sum "$tmp/swiftace" | cut -d ' ' -f 1)
elif command -v shasum > /dev/null; then
  actual=$(shasum -a 256 "$tmp/swiftace" | cut -d ' ' -f 1)
else
  fail "sha256sum or shasum is needed to check the download"
fi
[ "$expected" = "$actual" ] || fail "the download doesn't match its checksum; please try again"
chmod 755 "$tmp/swiftace"

# /usr/local/bin usually belongs to root.
sudo=
if [ "$(id -u)" != 0 ] && ! { mkdir -p "$dir" 2> /dev/null && [ -w "$dir" ]; }; then
  command -v sudo > /dev/null || fail "can't write to $dir; run this as root"
  echo "Installing at $dir/swiftace needs sudo"
  sudo=sudo
fi

# Copied next to the destination, then renamed over it, so an existing swiftace is replaced in one
# step (a running server keeps its copy) and never left half-written.
$sudo mkdir -p "$dir" || fail "couldn't create $dir"
$sudo cp "$tmp/swiftace" "$dir/.swiftace.new" || fail "couldn't write to $dir"
$sudo mv -f "$dir/.swiftace.new" "$dir/swiftace"

echo "Installed SwiftAce $("$dir/swiftace" version) at $dir/swiftace"

command=swiftace
found=$(command -v swiftace || true)
if [ -z "$found" ]; then
  echo "Note: $dir isn't on your PATH, so run it as $dir/swiftace."
  command="$dir/swiftace"
elif [ "$found" != "$dir/swiftace" ]; then
  echo "Note: running \`swiftace\` starts $found, which comes first on your PATH."
  command="$dir/swiftace"
fi
if [ "$os" = linux ]; then
  echo "To run it on this server, behind Caddy: sudo $command deploy <domain>"
else
  echo "Run \`$command help\` to see how to run it."
fi
