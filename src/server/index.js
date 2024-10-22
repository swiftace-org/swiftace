import pluginManager from "server/plugin-manager/index.js";
import server from "server/index.jsx";

pluginManager.loadPlugins();

export default {
  async fetch(request) {
    return await server.onRequest(request);
  },
};
