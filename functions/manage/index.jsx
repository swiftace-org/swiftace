import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { getCurrentUser } from "lib/utils/auth";
import { getSiteSettings, makeHtmlResponse, safeguard } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

export const onRequest = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });
  return makeHtmlResponse(
    <RootLayout title={`Admin - ${siteSettings.title}`} description={siteSettings.description} faviconUrl={siteSettings.favicon_url} styles={["ui", "manage"]}>
      <MainNav logoUrl={siteSettings.logo_url} currentUser={currentUser} siteTitle={siteSettings.title} />
      <main className="ui-container">
        <header className="manage-header">
          <h1 className="ui-page-heading">Manage - {siteSettings.title}</h1>
        </header>
        <section className="manage-links">
          <ul>
            <li>
              <a className="ui-link" href="/manage/courses">
                Courses
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
                Admins
              </a>
            </li>
          </ul>
        </section>
      </main>
    </RootLayout>
  );
});
