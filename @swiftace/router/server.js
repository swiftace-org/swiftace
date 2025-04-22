/**
 * A flexible and lightweight router implementation that supports various route patterns
 * including static routes, named parameters, catch-all parameters, and optional catch-all parameters.
 *
 * @module router
 *
 * @typedef {Object} Route
 * @property {string} path - The route path pattern
 * @property {string|Array<string>} method - HTTP method(s) for the route
 * @property {Function} handler - The handler function for the route
 *
 * @typedef {Object} MatchOptions
 * @property {Array<Route>} routes - Array of route definitions
 * @property {string} path - The request path to match against
 * @property {string} method - The HTTP method of the request
 *
 * @typedef {Object} MatchResult
 * @property {Function} [handler] - The matched route handler
 * @property {Object.<string, string|Array<string>>} [params] - The extracted route parameters
 *
 * @example
 * // Static route
 * const routes = [{
 *   path: '/users',
 *   method: 'GET',
 *   handler: () => 'List all users'
 * }];
 *
 * @example
 * // Named parameter
 * const routes = [{
 *   path: '/users/[id]',
 *   method: 'GET',
 *   handler: ({ params }) => `Get user ${params.id}`
 * }];
 *
 * @example
 * // Catch-all parameter
 * const routes = [{
 *   path: '/files/[...path]',
 *   method: 'GET',
 *   handler: ({ params }) => `Get file at ${params.path.join('/')}`
 * }];
 *
 * @example
 * // Optional catch-all parameter
 * const routes = [{
 *   path: '/blog/[[...slug]]',
 *   method: 'GET',
 *   handler: ({ params }) => `Get blog post ${params.slug?.join('/')}`
 * }];
 */

const router = {
  /**
   * Matches a request path and method against a set of routes and returns the matching handler and parameters.
   *
   * @param {MatchOptions} options - The matching options
   * @returns {MatchResult} The matching result
   *
   * @example
   * const result = router.match({
   *   routes: [{
   *     path: '/users/[id]',
   *     method: 'GET',
   *     handler: ({ params }) => `User ${params.id}`
   *   }],
   *   path: '/users/123',
   *   method: 'GET'
   * });
   * // result = { handler: [Function], params: { id: '123' } }
   */
  match({ routes, path, method }) {
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
};

export default router;
