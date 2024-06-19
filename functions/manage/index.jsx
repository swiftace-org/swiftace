import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { getCurrentUser } from "lib/utils/auth";
import { getSiteSettings, makeHtmlResponse, safeguard } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

/** TODO:
 * - [ ] Show tiles instead of just a list of links
 * - [ ] Create a page for saving encrypted secrets (instead of in dev.vars)
 */

export const onRequest = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });
  return makeHtmlResponse(
    <RootLayout
      title={`Manage Site - ${siteSettings.site_title}`}
      description={siteSettings.site_description}
      faviconUrl={siteSettings.site_favicon_url}
      styles={["ui", "manage"]}
    >
      <MainNav logoUrl={siteSettings.site_logo_url} currentUser={currentUser} siteTitle={siteSettings.site_title} />
      <main className="ui-container">
        <header className="manage-header">
          <h1 className="ui-page-heading">Manage Site - {siteSettings.site_title}</h1>
        </header>
        <section className="manage-links">
          <ul>
            <li>
              <a className="ui-link" href="/manage/courses">
                Manage Courses
              </a>
            </li>
            <li>
              <a className="ui-link" href="/manage/site-settings">
                Site Settings
              </a>
            </li>
            <li>
              <a className="ui-link" href="/manage/secrets">
                Site Secrets
              </a>
            </li>
            <li>
              <a className="ui-link" href="/manage/admins">
                Manage Admins
              </a>
            </li>
          </ul>
        </section>
      </main>
    </RootLayout>
  );
});
