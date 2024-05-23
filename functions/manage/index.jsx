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
    <RootLayout title={`Admin - ${siteSettings.title}`} description={siteSettings.description} faviconUrl={siteSettings.faviconUrl}>
      <MainNav logoUrl={siteSettings.logoUrl} currentUser={currentUser} siteTitle={siteSettings.title} />
      <main className="ui-container">
        <header className="ui-page-header">
          <h1 className="ui-page-heading">Manage - {siteSettings.title}</h1>
        </header>
      </main>
    </RootLayout>
  );
});
