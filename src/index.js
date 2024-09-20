import { onGetHome } from "./pages/index.jsx";

async function onRequest(request) {
  return await onGetHome(request);
}

export default { fetch: onRequest };
