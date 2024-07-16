export function matchRoute({ routes, path, method }) {
  // Normalize the input path by removing trailing slash (if any)
  const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;

  for (const route of routes) {
    // Check if the HTTP method matches
    if (Array.isArray(route.method) ? !route.method.includes(method) : !(route.method === method)) continue;

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
      }
      // Handle static segments
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
    }
    // Ensure all path segments are matched for non-catch-all routes
    else if (routeSegments.length !== pathSegments.length) {
      isMatch = false;
    }

    if (isMatch) {
      return { handler: route.handler, params };
    }
  }

  // No matching route found
  return {};
}
