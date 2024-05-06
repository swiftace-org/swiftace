import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { makeHtmlResp, safeguard } from "lib/utils";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ request, env }) {
  return makeHtmlResp(
    <RootLayout title={env.SITE_TITLE} description={env.SITE_DESCRIPTION} faviconSrc={env.FAVICON_URL}>
      <MainNav logoSrc={env.LOGO_URL} siteTitle={env.SITE_TITLE} />
      <div>Hello world</div>
    </RootLayout>
  );
});
