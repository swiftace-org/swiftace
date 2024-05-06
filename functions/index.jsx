import { makeErrorResp, makeHtmlResp } from "lib/utils";
import jsx from "lib/utils/jsx";

export async function onRequest({ request, env }) {
  try {
    return makeHtmlResp(<div>Hello world</div>);
  } catch (error) {
    return makeErrorResp({ error, status: 500 });
  }
}
