/** TODO
 * - [ ] Rename
 * - [ ] Send the uploaded favicon for /favicon.ico
 * - [ ] Set up a proper not found page
 * - [ ] Pass database, kvStore, and fileStore as params
 * - [ ] Add routes for terms of service and privacy policy
 * - [ ] Set up some form of advanced Regex router?
 * - [ ] Move static file fetching to _routes.json
 * - [ ] Write extensive test for matchRoute
 * - [ ] Write assertions for `matchRoute`
 * - [ ] Add proper caching for files
 * - [ ] Write more detailed assertions for datbase, kvStore, and fileStore
 * - [ ] Add assertions literally everywhere
 * - [ ] Add "Method Not Allowed" error in matchRoute
 */

import { onGetDebug } from "pages/debug";
import { onGetFile } from "pages/files/[...path]";
import { onGetHome } from "pages";
import { onGetLogin, onPostLogin } from "pages/login";
import { onGetLogout } from "pages/logout";
import { onGetManage } from "pages/manage";
import { onGetManageCourses } from "pages/manage/courses";
import { onManageCourse } from "pages/manage/courses/[slug]";
import { onNewCourse } from "pages/manage/courses/new";
import { onGetSiteSettings, onPostSiteSettings } from "pages/manage/site-settings";
import { onGetSettings, onPostSettings } from "pages/settings";
import { matchRoute } from "lib/routing";
import { makeErrorResponse } from "lib/cloudflare";
import { EnvKeys } from "lib/constants";
import { assertEnvKeys } from "lib/assertion";

const Routes = [
  { path: "/files/[...path]", method: "GET", handler: onGetFile },
  { path: "/", method: "GET", handler: onGetHome },
  { path: "/debug", method: "GET", handler: onGetDebug },
  { path: "/login", method: "GET", handler: onGetLogin },
  { path: "/login", method: "POST", handler: onPostLogin },
  { path: "/logout", method: "GET", handler: onGetLogout },
  { path: "/settings", method: "GET", handler: onGetSettings },
  { path: "/settings", method: "POST", handler: onPostSettings },
  { path: "/manage", method: "GET", handler: onGetManage },
  { path: "/manage/site-settings", method: "GET", handler: onGetSiteSettings },
  { path: "/manage/site-settings", method: "POST", handler: onPostSiteSettings },
  { path: "/manage/courses", method: "GET", handler: onGetManageCourses },
  { path: "/manage/courses/new", method: ["GET", "POST"], handler: onNewCourse },
  { path: "/manage/courses/[slug]", method: ["GET", "POST"], handler: onManageCourse },
];

async function onRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const { handler, params } = matchRoute({ path, method, routes: Routes });
  if (handler) {
    try {
      assertEnvKeys({ tag: "onRequest", env, keys: [EnvKeys.database, EnvKeys.kvStore, EnvKeys.fileStore] });
      const database = env[EnvKeys.database];
      const kvStore = env[EnvKeys.kvStore];
      const fileStore = env[EnvKeys.fileStore];
      const { waitUntil } = ctx;
      return await handler({ request, params, database, kvStore, fileStore, waitUntil, env });
    } catch (error) {
      return makeErrorResponse({ error, status: 500 });
    }
  }
  return new Response(null, { status: 404, statusText: "Not Found" });
}

export default { fetch: onRequest };
