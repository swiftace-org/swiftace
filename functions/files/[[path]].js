import { FileStorePrefixes, safeguard } from "lib/utils/cloudflare";

/** TODO:
 * - [ ] Check that the MIME type matches the extension
 * - [ ] If a "t" search param is present, add cache headers
 * - [x] Add some special logic to only allow valid folder prefixes?
 */
export const onRequestGet = safeguard(async function ({ env, params }) {
  const { FILE_STORE: fileStore } = env;
  const path = params.path;
  if (Object.values(FileStorePrefixes).indexOf(path[0]) == -1) return new Response("Not Found", { status: 404 });

  const joinedPath = path.join("/");
  const assetKey = removePathExtension(joinedPath);
  const object = await fileStore.get(assetKey);
  if (object == null) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
});

function removePathExtension(path) {
  const lastIndex = path.lastIndexOf(".");
  if (lastIndex == -1) return path;
  return path.substring(0, lastIndex);
}
