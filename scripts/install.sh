#!/bin/sh
# Downloads the SwiftAce binary for this machine into the current folder as `swiftace`, checked
# against its release's SHA256SUMS. Published with every release:
#
#   curl -fsSL https://github.com/swiftace-org/swiftace/releases/latest/download/install.sh | sh
#
# SWIFTACE_VERSION=0.1.1 installs that release rather than the latest, and SWIFTACE_RELEASES_URL
# points it somewhere other than this repository's releases, as for `swiftace upgrade`.
set -eu

fail() {
  echo "install.sh: $*" >&2
  exit 1
}

case "$(uname -s)" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  *) fail "there are no releases for $(uname -s); see https://github.com/swiftace-org/swiftace" ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch=x64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) fail "there are no releases for $(uname -m)" ;;
esac
asset="swiftace-$os-$arch"

releases="${SWIFTACE_RELEASES_URL:-https://github.com/swiftace-org/swiftace/releases}"
releases="${releases%/}"
if [ -n "${SWIFTACE_VERSION:-}" ]; then
  url="$releases/download/v${SWIFTACE_VERSION#v}"
else
  url="$releases/latest/download"
fi

if command -v sha256sum > /dev/null 2>&1; then
  sha256() { sha256sum "$1" | cut -d' ' -f1; }
elif command -v shasum > /dev/null 2>&1; then
  sha256() { shasum -a 256 "$1" | cut -d' ' -f1; }
else
  fail "neither sha256sum nor shasum is installed, so the download can't be checked"
fi

# Downloaded beside where it ends up, so the final rename can't cross filesystems.
part="./.swiftace.download.$$"
sums="./.swiftace.sums.$$"
trap 'rm -f "$part" "$sums"' EXIT INT TERM

echo "Downloading $asset from $url"
curl -fsSL -o "$sums" "$url/SHA256SUMS" || fail "couldn't download $url/SHA256SUMS"
expected="$(awk -v name="$asset" '$2 == name || $2 == "*" name { print $1 }' "$sums")"
[ -n "$expected" ] || fail "the release's SHA256SUMS doesn't list $asset"
curl -fL --progress-bar -o "$part" "$url/$asset" || fail "couldn't download $url/$asset"
[ "$(sha256 "$part")" = "$expected" ] || fail "the downloaded $asset doesn't match SHA256SUMS"

chmod +x "$part"
mv -f "$part" ./swiftace
echo "Installed SwiftAce $(./swiftace version) as ./swiftace"
