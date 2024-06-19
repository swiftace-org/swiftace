import jsx from "lib/utils/jsx";
import { MainNav } from "./main-nav";
import { NotFound } from "./not-found";
import { RootLayout } from "./root-layout";

export const NotFoundPage = ({ siteSettings, currentUser }) => {
  return (
    <RootLayout title={`Not Found - ${siteSettings.site_title}`} description={siteSettings.site_description} faviconUrl={siteSettings.site_favicon_url}>
      <MainNav siteTitle={siteSettings.site_title} logoUrl={siteSettings.site_logo_url} currentUser={currentUser} />
      <NotFound />
    </RootLayout>
  );
};
