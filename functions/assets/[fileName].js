import { FileStorePrefix, safeguard } from "lib/utils/cloudflare";

export const onRequestGet = safeguard(async function ({ request, env, params }) {
  const { FILE_STORE: fileStore } = env;
  const assetName = params.fileName.split(".")[0];
  const key = `${FileStorePrefix.assets}/${assetName}`;
  const object = await fileStore.get(key);
  if (object === null) return new Response("Not Found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
});
