import server from "./server/index.jsx";
import pluginManager from "./plugin-manager/index.js";

pluginManager.loadPlugins();

export default {
  async fetch(request) {
    return await server.onRequest(request);
  },
};
