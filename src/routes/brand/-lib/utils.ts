/**
 * An upload's URL, from its R2 key: `brand/icon-3fa9c2e1b07d.png` is served at
 * `/_brand/icon-3fa9c2e1b07d.png`. The underscore keeps it clear of legacy `/:username` paths.
 */
export function toBrandAssetUrl(key: string): string {
  return key ? `/_${key}` : ""
}
