import jshtmlServer from "@swiftace/jshtml/server.js";

const coreServer = {
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Check if the request is for a public file
    const publicFileMatch = coreServer.isPublicFilePath(path);
    if (publicFileMatch) {
      const [, scope, project, filePath] = publicFileMatch;
      return coreServer.servePublicFile(scope, project, filePath);
    }

    // Return the home page for the root path
    const html = jshtmlServer.renderToHtml([coreServer.homePage]);
    return new Response(html, {
      headers: { "content-type": "text/html" },
    });
  },

  /**
   * Maps file extensions to their corresponding MIME content types
   * @type {Object.<string, string>}
   */
  extensionContentTypes: {
    "html": "text/html",
    "css": "text/css",
    "js": "application/javascript",
    "json": "application/json",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "svg": "image/svg+xml",
    "ico": "image/x-icon",
  },

  /**
   * Checks if the given path matches the pattern for a public file request
   * @param {string} path - The URL path to check
   * @returns {Array|null} Array of matches if path is a public file request, null otherwise
   */
  isPublicFilePath(path) {
    return path.match(/\/@([^\/]+)\/([^\/]+)\/public\/(.*)/);
  },

  /**
   * Serves a public file from the filesystem
   * @param {string} scope - The scope of the file (e.g., 'swiftace')
   * @param {string} project - The project name
   * @param {string} filePath - The path to the file within the public directory
   * @returns {Response} Response containing the file content or error message
   */
  async servePublicFile(scope, project, filePath) {
    const resolved = await import(`@${scope}/${project}/server.js`);
    const resolvedDirname = resolved.default.dirname;
    const resolvedPath = `${resolvedDirname}/public/${filePath}`;

    try {
      const fileContent = await Deno.readFile(resolvedPath);
      const contentType = coreServer.getContentType(filePath);
      return new Response(fileContent, {
        headers: { "content-type": contentType },
      });
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new Response("File not found", { status: 404 });
      }
      return new Response("Internal server error", { status: 500 });
    }
  },

  /**
   * Creates the home page component
   * @returns {Array} JSHTML element array representing the home page
   */
  homePage() {
    return [
      `html`,
      [
        `head`,
        [`title`, "Welcome to SwiftAce"],
        [`meta`, { charset: "utf-8" }],
        [`meta`, {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        }],
        [`link`, {
          rel: "stylesheet",
          href: "/@swiftace/main/public/styles.css",
        }],
        [`script`, {
          src: "/@swiftace/main/public/client.js",
          defer: true,
        }],
      ],
      [
        `body`,
        [`div`, { class: "container" }, [`h1`, "Welcome to SwiftAce"], [
          `p`,
          "A modern web application built with Deno and pure JavaScript.",
        ], [
          `ul`,
          [`li`, "No frontend frameworks"],
          [`li`, "No third-party services"],
          [`li`, "Deployed to plain cloud VMs"],
          [`li`, "100% test coverage"],
          [`li`, "No build step"],
          [`li`, "Extensible by design"],
        ]],
      ],
    ];
  },

  /**
   * Determines the MIME content type based on a file's extension
   * @param {string} filePath - The path or name of the file
   * @returns {string} The MIME content type for the file
   */
  getContentType(filePath) {
    const extension = filePath.split(".").pop()?.toLowerCase();
    return coreServer.extensionContentTypes[extension] ||
      "application/octet-stream";
  },

  dirname: import.meta.dirname,
};

export default coreServer;
