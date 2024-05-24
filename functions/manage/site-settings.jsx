import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { getCurrentUser } from "lib/utils/auth";
import { getSiteSettings, makeHtmlResponse, safeguard } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database, checkAdmin: true });

  if (!currentUser || !currentUser?.is_admin) {
    return makeHtmlResponse(<div>Not Found</div>);
  }

  return makeHtmlResponse(
    <RootLayout
      title={`Manage Site Settings - ${siteSettings.title}`}
      description={siteSettings.description}
      faviconUrl={siteSettings.faviconUrl}
      styles={["ui", "site-settings"]}
    >
      <MainNav siteTitle={siteSettings.title} logoUrl={siteSettings.logoUrl} currentUser={currentUser} />
      <main className="ui-container">
        <header className="site-settings-header">
          <h1 className="ui-page-heading">Manage Site Settings</h1>
        </header>
        <form className="site-settings-form">
          <fieldset>
            <label>
              <div className="ui-form-label">Site Title</div>
              <input className="ui-form-input" name="title" type="text" required value={siteSettings.title} />
            </label>
            <label>
              <div className="ui-form-label">Site Tagline</div>
              <input className="ui-form-input" name="tagline" type="text" required value={siteSettings.tagline} />
            </label>
            <label>
              <div className="ui-form-label">Site Description</div>
              <textarea className="ui-form-input" name="description" required rows={4}>
                {siteSettings.description}
              </textarea>
            </label>
            <label>
              <div className="ui-form-label">Site Logo</div>
              <input className="ui-form-input" name="logoUrl" type="file" required />
            </label>
            <label>
              <div className="ui-form-label">Site Favicon</div>
              <input className="ui-form-input" name="faviconUrl" type="file" required />
            </label>
            <label>
              <div className="ui-form-label">Terms of Service</div>
              <input className="ui-form-input" name="termsOfServiceUrl" type="file" required />
            </label>
            <label>
              <div className="ui-form-label">Privacy Policy</div>
              <input className="ui-form-input" name="privacyPolicyUrl" type="file" required />
            </label>
            <label>
              <div className="ui-form-label">User Session Length (seconds)</div>
              <input className="ui-form-input" name="faviconUrl" type="number" required value={siteSettings.sessionExpiryInSeconds} />
            </label>
            <label>
              <div className="ui-form-label">Email Verification Code Expiry (seconds)</div>
              <input className="ui-form-input" name="faviconUrl" type="number" required value={siteSettings.otpExpiryInSeconds} />
            </label>
          </fieldset>
          <footer>
            <input type="submit" className="ui-button" value="Save Settings" />
          </footer>
        </form>
      </main>
    </RootLayout>
  );
});

// TODO - Add the POST request for handling submissions
