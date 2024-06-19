import { FileStorePrefixes, SiteAssetsKeys, safeguard } from "lib/utils/cloudflare";

export const onRequestGet = safeguard(async function ({ env, params }) {
  const { FILE_STORE: fileStore } = env;
  const userId = params.fileName.split(".")[0];

  const object = await fileStore.get(`${FileStorePrefixes.avatars}/${userId}`);
  if (object === null) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
});
