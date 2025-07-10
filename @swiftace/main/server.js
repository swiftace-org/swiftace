/**
 * @module @swiftace/main/server
 * @description Core server implementation for SwiftAce, handling routing, file serving, and page rendering.
 */

import markup from "@shipjs/markup/server.js";

/**
 * Core server implementation for SwiftAce
 * @type {Object}
 */
const coreServer = {
  /**
   * Main request handler for the server
   * @param {Request} req - The incoming HTTP request
   * @returns {Promise<Response>} The HTTP response
   */
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Check if the request is for a public file
    const publicFileMatch = coreServer.isPublicFilePath(path);
    if (publicFileMatch) {
      const [, scope, project, filePath] = publicFileMatch;
      return coreServer.servePublicFile(scope, project, filePath);
    }

    // Use matchRoute to match the request
    const match = coreServer.matchRoute({
      routes: coreServer.routes,
      path,
      method,
    });

    if (match.handler) {
      const html = markup.renderToHtml([match.handler]);
      return new Response(html, {
        headers: { "content-type": "text/html" },
      });
    }

    // Return 404 if no route matches
    return new Response("Not Found", { status: 404 });
  },

  /**
   * Array of route definitions for the server
   * @type {Array<Object>}
   * @property {string} path - The route path pattern
   * @property {string} method - HTTP method for the route
   * @property {Function} handler - The handler function for the route
   */
  routes: [
    {
      path: "/",
      method: "GET",
      handler: () => coreServer.homePage(),
    },
    {
      path: "/about",
      method: "GET",
      handler: () => coreServer.aboutPage(),
    },
  ],

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
   * Navigation component for the application
   * @returns {Array} Markup element array representing the navigation bar
   */
  Nav() {
    return [
      `nav`,
      { style: "display: flex; gap: 1rem;" },
      [`a`, { href: "/" }, "Home"],
      [`a`, { href: "/about" }, "About"],
    ];
  },

  /**
   * Creates the home page component
   * @returns {Array} Markup element array representing the home page
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
        [
          `div`,
          { class: "container" },
          [`h1`, "Welcome to SwiftAce"],
          [coreServer.Nav],
          [
            `p`,
            "A modern web application built with Deno and pure JavaScript.",
          ],
          [
            `ul`,
            [`li`, "No frontend frameworks"],
            [`li`, "No third-party services"],
            [`li`, "Deployed to plain cloud VMs"],
            [`li`, "100% test coverage"],
            [`li`, "No build step"],
            [`li`, "Extensible by design"],
          ],
          [
            `p`,
            "Rendered from ",
            ["code", coreServer.dirname],
          ],
        ],
      ],
    ];
  },

  /**
   * Creates the about page component
   * @returns {Array} Markup element array representing the about page
   */
  aboutPage() {
    return [
      `html`,
      [
        `head`,
        [`title`, "About SwiftAce"],
        [`meta`, { charset: "utf-8" }],
        [
          `meta`,
          { name: "viewport", content: "width=device-width, initial-scale=1" },
        ],
        [
          `link`,
          { rel: "stylesheet", href: "/@swiftace/main/public/styles.css" },
        ],
        [
          `script`,
          { src: "/@swiftace/main/public/client.js", defer: true },
        ],
      ],
      [
        `body`,
        [
          `div`,
          { class: "container" },
          [`h1`, "About SwiftAce"],
          [coreServer.Nav],
          [
            `p`,
            "SwiftAce is a modern web application framework built with Deno and pure JavaScript.",
          ],
          [
            `p`,
            "It focuses on simplicity, performance, and developer experience.",
          ],
          [`h2`, "Key Features"],
          [
            `ul`,
            [`li`, "Lightweight and fast"],
            [`li`, "No build step required"],
            [`li`, "Built-in routing system"],
            [`li`, "Component-based architecture"],
            [`li`, "Server-side rendering"],
          ],
        ],
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

  /**
   * Matches a request path and method against a set of routes and returns the matching handler and parameters.
   * Supports various route patterns including static routes, named parameters,
   * catch-all parameters, and optional catch-all parameters.
   *
   * @typedef {Object} Route
   * @property {string} path - The route path pattern
   * @property {string|Array<string>} method - HTTP method(s) for the route
   * @property {Function} handler - The handler function for the route
   *
   * @typedef {Object} MatchResult
   * @property {Function} [handler] - The matched route handler
   * @property {Object.<string, string|Array<string>>} [params] - The extracted route parameters
   *
   * @param {Object} options - The matching options
   * @param {Array<Route>} options.routes - Array of route definitions
   * @param {string} options.path - The request path to match against
   * @param {string} options.method - The HTTP method of the request
   * @returns {MatchResult} The matching result
   *
   * @example
   * const routes = [
   *   { path: '/users', method: 'GET', handler: () => {} }, // Static route
   *   { path: '/users/[id]', method: 'GET', handler: ({ params }) => {} }, // Named parameter
   *   { path: '/files/[...path]', method: 'GET', handler: ({ params }) => {} }, // Catch-all parameter
   *   { path: '/blog/[[...slug]]', method: 'GET', handler: ({ params }) => {} }, // Optional catch-all parameter
   * ];
   *
   * matchRoute({ routes, path: '/users', method: 'GET' }); // static route
   * matchRoute({ routes, path: '/users/123', method: 'GET' }); // named parameter
   * matchRoute({ routes, path: '/files/docs/report.pdf', method: 'GET' }); // catch-all parameter
   * matchRoute({ routes, path: '/blog', method: 'GET' }); // optional catch-all parameter
   * matchRoute({ routes, path: '/blog/2024/03/hello', method: 'GET' }); // optional catch-all parameter
   */
  matchRoute({ routes, path, method }) {
    // Normalize the input path by removing trailing slash (if any)
    const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;

    for (const route of routes) {
      // Check if the HTTP method matches
      if (
        Array.isArray(route.method)
          ? !route.method.includes(method)
          : !(route.method === method)
      ) continue;

      // Split both the route path and the input path into segments
      const routeSegments = route.path.split("/").filter(Boolean);
      const pathSegments = normalizedPath.split("/").filter(Boolean);

      let params = {};
      let isMatch = true;
      let catchAllParam = null;

      // Loop through the route segments to check for a match
      for (let i = 0; i < routeSegments.length; i++) {
        const routeSegment = routeSegments[i];
        const pathSegment = pathSegments[i];

        // Handle named parameters
        if (routeSegment.startsWith("[") && routeSegment.endsWith("]")) {
          const paramName = routeSegment.slice(1, -1);

          // Handle catch-all segments
          if (paramName.startsWith("...")) {
            catchAllParam = paramName.slice(3);
            break;
          }

          // Handle optional catch-all segments
          if (paramName.startsWith("[...") && paramName.endsWith("]")) {
            catchAllParam = paramName.slice(4, -1);
            break;
          }

          // Regular named parameter
          if (pathSegment) {
            params[paramName] = pathSegment;
          } else {
            isMatch = false;
            break;
          }
        } // Handle static segments
        else if (routeSegment !== pathSegment) {
          isMatch = false;
          break;
        }
      }

      // Handle catch-all parameter values
      if (catchAllParam !== null) {
        const remainingSegments = pathSegments.slice(routeSegments.length - 1);
        if (remainingSegments.length > 0 || catchAllParam.startsWith("[[")) {
          params[catchAllParam] = remainingSegments;
        } else {
          isMatch = false;
        }
      } // Ensure all path segments are matched for non-catch-all routes
      else if (routeSegments.length !== pathSegments.length) {
        isMatch = false;
      }

      if (isMatch) {
        return { handler: route.handler, params };
      }
    }

    // No matching route found
    return {};
  },

  /**
   * Directory name of the current module
   * @type {string}
   */
  dirname: import.meta.dirname,
};

export default coreServer;
