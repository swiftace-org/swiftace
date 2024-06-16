import { FileStorePrefixes, SiteAssetsKeys, safeguard } from "lib/utils/cloudflare";

export const onRequestGet = safeguard(async function ({ env, params }) {
  const { FILE_STORE: fileStore } = env;
  const assetKey = params.fileName.split(".")[0];
  if (Object.values(SiteAssetsKeys).indexOf(assetKey) == -1) return new Response("Not Found", { status: 404 });

  const object = await fileStore.get(`${FileStorePrefixes.assets}/${assetKey}`);
  if (object === null) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
});
