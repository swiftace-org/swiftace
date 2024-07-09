import jsx from "lib/utils/jsx";
import { MainNav } from "./main-nav";
import { RootLayout } from "./root-layout";

export const NotFoundPage = ({ siteSettings, currentUser }) => {
  return (
    <RootLayout
      title={`Not Found - ${siteSettings.site_title}`}
      description={siteSettings.site_description}
      faviconUrl={siteSettings.site_favicon_url}
    >
      <MainNav
        siteTitle={siteSettings.site_title}
        logoUrl={siteSettings.site_logo_url}
        currentUser={currentUser}
      />
      <NotFound currentUser={currentUser} />
    </RootLayout>
  );
};

export const NotFound = ({ currentUser = null }) => {
  return (
    <div class="container small">
      <header class="page-header">
        <h1 class="page-heading">Page Not Found</h1>
        <p class="page-subheading">Sorry, this page does not exist or is private.</p>
      </header>
      <section class="page-section">
        <div class="button-row">
          <a class="button wide" href="/">
            Home
          </a>
          {!currentUser && (
            <a class="button outline wide" href="/login">
              Sign In
            </a>
          )}
        </div>
      </section>
    </div>
  );
};
