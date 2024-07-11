import jsx from "lib/utils/jsx";
import { MainNav } from "./main-nav";
import { RootLayout } from "./root-layout";
import { assert, isObject } from "lib/utils/validation";

export const NotFoundPage = ({ siteSettings, currentUser }) => {
  const tag = "NotFoundPage";

  assert({
    tag,
    check: isObject(siteSettings),
    error: "'siteSettings' must be an object",
    data: { siteSettings },
  });

  assert({
    tag,
    check: typeof siteSettings.site_title === "string" && siteSettings.site_title.length > 0,
    error: "'siteSettings.site_title' must be a non-empty string",
    data: { site_title: siteSettings.site_title },
  });

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

export const NotFound = ({ currentUser }) => {
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
