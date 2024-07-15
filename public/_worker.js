/** TODO
 * - [ ] Send the uploaded favicon for /favicon.ico
 * - [ ] Move the logic from safeguard into this file
 * - [ ] Set up a proper not found page
 * - [ ] Pass database, keyValueStore, and fileStore as params
 * - [ ] Add routes for terms of service and privacy policy
 * - [ ] Set up some form of advanced Regex router?
 */

import { onGetDebug } from "routes/debug";
import { onGetFile } from "routes/files/[[path]]";
import { onGetHome } from "routes/home";
import { onGetLogin, onPostLogin } from "routes/login";
import { onLogout } from "routes/logout";
import { onGetManage } from "routes/manage";
import { onGetManageCourses } from "routes/manage/courses";
import { onManageCourse } from "routes/manage/courses/[slug]";
import { onNewCourse } from "routes/manage/courses/new";
import { onGetSiteSettings, onPostSiteSettings } from "routes/manage/site-settings";
import { onGetSettings, onPostSettings } from "routes/settings";

function onRequest({ request, env, ctx }) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Static Files
  if (path.startsWith("/js") || path.startsWith("/css") || path.startsWith("/img")) {
    return env.ASSETS.fetch(request);
  }

  // Favicon
  if (path === "/favicon.ico") {
    return env.ASSETS.fetch(request);
  }

  // Home
  if (path === "/" && method === "GET") {
    return onGetHome({ request, env, ctx });
  }

  // Debug
  if (path === "/debug" && method === "GET") {
    return onGetDebug({ request, env, ctx });
  }

  // Login
  if (path === "/login") {
    if (method === "GET") {
      return onGetLogin({ request, env, ctx });
    }
    if (method === "POST") {
      return onPostLogin({ request, env, ctx });
    }
  }

  // Logout
  if (path === "/logout") {
    return onLogout({ request, env, ctx });
  }

  // Files
  if (path.startsWith("/files")) {
    return onGetFile({ request, env, ctx, params: { path: path.replace(/^\/files\//, "").split("/") } });
  }

  // Settings
  if (path.startsWith("/settings")) {
    if (method === "GET") {
      return onGetSettings({ request, env, ctx });
    }
    if (method === "POST") {
      return onPostSettings({ request, env, ctx });
    }
  }

  if (path.startsWith("/manage")) {
    const subpath = path.replace(/^\/manage/, "");

    if (subpath === "" && method === "GET") {
      return onGetManage({ request, env, ctx });
    }

    if (subpath === "/site-settings") {
      if (method === "GET") {
        return onGetSiteSettings({ request, env, ctx });
      }
      if (method === "POST") {
        return onPostSiteSettings({ request, env, ctx });
      }
    }

    if (subpath.startsWith("/courses")) {
      const courseSubpath = subpath.replace(/^\/courses/, "");

      if (courseSubpath === "" && method === "GET") {
        return onGetManageCourses({ request, env, ctx });
      }

      if (courseSubpath === "/new") {
        return onNewCourse({ request, env, ctx });
      }

      const courseSlug = courseSubpath.split("/")[1];
      if (courseSlug) {
        return onManageCourse({ request, env, ctx, params: { slug: courseSlug } });
      }
    }
  }

  return new Response(null, { status: 404, statusText: "Not Found" });
}

export default {
  async fetch(request, env, ctx) {
    return onRequest({ request, env, ctx });
  },
};
