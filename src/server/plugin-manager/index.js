import { existsSync } from "@std/fs";

async function loadPlugins() {
  const cwd = Deno.cwd();
  const pluginsDir = cwd + "/src/plugins";

  if (!existsSync(pluginsDir)) {
    console.info(`Plugins directory does not exist: ${pluginsDir}`);
    return;
  }

  for (const entry of Deno.readDirSync(pluginsDir)) {
    if (!entry.isDirectory) {
      console.warn(`Unexpected entry in plugins directory: ${entry.name}`);
      continue;
    }
    // TODO(@aakashns) - [ ] Add support ".ts", ".jsx", and ".js" files
    // TODO(@aakashns) - [ ] Add support for install, init, and uninstall methods
    const pluginIndexPath = `${pluginsDir}/${entry.name}/index.js`;
    if (!existsSync(pluginIndexPath)) {
      console.warn(
        `Plugin ${entry.name} does not contain a root "index.js" file`,
      );
      continue;
    }

    await import(`/plugins/${entry.name}/index.js`);
  }
}

export default {
  loadPlugins,
};
