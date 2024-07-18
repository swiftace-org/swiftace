import { Breadcrumb } from "ui/breadcrumb";
import { MainNav } from "ui/main-nav";
import { RootLayout } from "ui/root-layout";
import { getCurrentUser } from "lib/auth";
import { getSiteSettings, makeHtmlResponse } from "lib/cloudflare";
import jsx from "lib/jsx";

/** TODO:
 * - [ ] Show tiles instead of just a list of links
 * - [ ] Create a page for saving encrypted secrets (instead of in dev.vars)
 */

export async function onGetManage({ request, kvStore, database }) {
  const siteSettings = await getSiteSettings({ kvStore });
  const currentUser = await getCurrentUser({ request, database });
  return makeHtmlResponse(<ManagePage siteSettings={siteSettings} currentUser={currentUser} />);
}

function ManagePage({ siteSettings, currentUser }) {
  return (
    <RootLayout
      title={`Manage - ${siteSettings.site_title}`}
      description={siteSettings.site_description}
      faviconUrl={siteSettings.site_favicon_url}
    >
      <MainNav
        logoUrl={siteSettings.site_logo_url}
        currentUser={currentUser}
        siteTitle={siteSettings.site_title}
      />
      <main class="container small">
        <header class="page-header">
          <Breadcrumb items={[{ label: "Home", href: "/" }]} />
          <h1 class="page-heading">Manage - {siteSettings.site_title}</h1>
        </header>
        <section class="page-section">
          <ul>
            <li>
              <a class="link" href="/manage/courses">
                Manage Courses
              </a>
            </li>
            <li>
              <a class="link" href="/manage/site-settings">
                Site Settings
              </a>
            </li>
            <li>
              <a class="link" href="/manage/secrets">
                Site Secrets
              </a>
            </li>
            <li>
              <a class="link" href="/manage/admins">
                Manage Admins
              </a>
            </li>
          </ul>
        </section>
      </main>
    </RootLayout>
  );
}
