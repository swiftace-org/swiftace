import { Alert } from "lib/ui/alert";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { getCurrentUser } from "lib/utils/auth";
import { CachePrefix, FileStorePrefix, getSiteSettings, makeHtmlResponse, safeguard } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

async function uploadSiteAsset({ fileStore, file, name, maxSize }) {
  if (!file) return { url: null };
  if (file.size > maxSize) return { error: `File uploaded for ${name} should not exceed ${maxSize} bytes.` };
  const extension = file.name.split(".").pop();
  const key = `${FileStorePrefix.assets}/${name}`;
  const uploadResult = await fileStore.put(key, file, { httpMetadata: { contentType: file.type }, customMetadata: { extension } });
  const uploadTimestamp = uploadResult.uploaded.getTime();
  return { url: `/assets/${name}.${extension}?t=${uploadTimestamp}` };
}

export const onRequest = safeguard(async function ({ request, env }) {
  if (request.method !== "GET" && request.method !== "POST") return new Response("Method Not Supported", { status: 405 });
  const { DB: database, CACHE_KV: cacheKv, FILE_STORE: fileStore } = env;
  const currentUser = await getCurrentUser({ request, database, checkAdmin: true });
  // TODO - Implement Not Found Pagae
  if (!currentUser || !currentUser?.is_admin) return makeHtmlResponse(<div>Not Found</div>);

  const siteSettings = await getSiteSettings({ cacheKv });
  console.log({ siteSettings });
  if (request.method === "GET") {
    return makeHtmlResponse(<SiteSettingsPage siteSettings={siteSettings} currentUser={currentUser} />);
  } else if (request.method === "POST") {
    const formData = await request.formData();

    const logo_file = formData.get("logo_file");
    const favicon_file = formData.get("favicon_file");
    const terms_of_service_file = formData.get("terms_of_service_raw_file");
    const privacy_policy_file = formData.get("privacy_policy_raw_file");

    const [
      { url: favicon_url, error: favicon_error },
      { url: logo_url, error: logo_error },
      { url: terms_of_service_raw_url, error: terms_of_service_error },
      { url: privacy_policy_raw_url, error: privacy_policy_error },
    ] = await Promise.all([
      uploadSiteAsset({ fileStore, name: "favicon", file: favicon_file, maxSize: 100 * 1024 }),
      uploadSiteAsset({ fileStore, name: "logo", file: logo_file, maxSize: 2 * 1024 * 1024 }),
      uploadSiteAsset({ fileStore, name: "terms_of_service", file: terms_of_service_file, maxSize: 1024 * 1024 }),
      uploadSiteAsset({ fileStore, name: "privacy_policy", file: privacy_policy_file, maxSize: 1024 * 1024 }),
    ]);

    const newSettings = {
      title: formData.get("title")?.trim() ?? siteSettings.title,
      tagline: formData.get("tagline")?.trim() ?? siteSettings.tagline,
      description: formData.get("description")?.trim() ?? siteSettings.description,
      favicon_url: favicon_url ?? siteSettings.favicon_url,
      logo_url: logo_url ?? siteSettings.logo_url,
      terms_of_service_raw_url: terms_of_service_raw_url ?? siteSettings.terms_of_service_raw_url,
      privacy_policy_raw_url: privacy_policy_raw_url ?? siteSettings.privacy_policy_raw_url,
      session_expiry_seconds: formData.get("session_expiry_seconds")?.trim() ?? siteSettings.session_expiry_seconds,
      otp_expiry_seconds: formData.get("otp_expiry_seconds")?.trim() ?? siteSettings.otp_expiry_seconds,
    };

    const errors = {
      title: null,
      tagline: null,
      description: null,
      favicon_url: favicon_error,
      logo_url: logo_error,
      terms_of_service_raw_url: terms_of_service_error,
      privacy_policy_raw_url: privacy_policy_error,
      session_expiry_seconds: null,
      otp_expiry_seconds: null,
    };

    const putResult = await cacheKv.put(CachePrefix.siteSettings, JSON.stringify(newSettings));
    console.log({ putResult });

    return makeHtmlResponse(<SiteSettingsPage siteSettings={newSettings} errors={errors} currentUser={currentUser} />);
  }
});

// TODO - Show Success Message
const SiteSettingsPage = ({ siteSettings, currentUser, errors = null, success = false }) => (
  <RootLayout
    title={`Manage Site Settings - ${siteSettings.title}`}
    description={siteSettings.description}
    faviconUrl={siteSettings.favicon_url}
    styles={["ui", "site-settings"]}
  >
    <MainNav siteTitle={siteSettings.title} logoUrl={siteSettings.logo_url} currentUser={currentUser} />
    <main className="ui-container">
      <header className="site-settings-header">
        <h1 className="ui-page-heading">Manage Site Settings</h1>
      </header>
      <form
        className="site-settings-form"
        method="post"
        enctype="multipart/form-data"
        onsubmit="return window.confirm('Are you sure you want to save the site settings?')"
      >
        {errors && <Alert title="Error" message="Some settings were not saved. Please fix the errors." variant="error" />}
        {success && <Alert title="Success" message="Settings saved successfully." variant="success" />}
        <fieldset>
          <SiteTitleInput value={siteSettings.title} error={errors?.title} />
          <SiteTaglineInput value={siteSettings.tagline} error={errors?.tagline} />
          <SiteDescriptionInput value={siteSettings.description} error={errors?.description} />
          <SiteLogoInput value={siteSettings.logo_url} error={errors?.logo_url} />
          <SiteFavicon value={siteSettings.favicon_url} error={errors?.favicon_url} />
          <SiteTermsOfServiceInput value={siteSettings?.terms_of_service_raw_url} />
          <SitePrivacyPolicyInput value={siteSettings?.privacy_policy_raw_url} />
          <SessionExpiryInput value={siteSettings?.session_expiry_seconds} />
          <OTPExpiryInput value={siteSettings?.otp_expiry_seconds} />
        </fieldset>
        <footer>
          <input type="submit" className="ui-button" value="Save Settings" />
        </footer>
      </form>
    </main>
  </RootLayout>
);

const SiteTitleInput = ({ value, error = null }) => (
  <>
    <label>
      <div className="ui-form-label">Site Title</div>
      <input className="ui-form-input" name="title" type="text" required value={value} maxlength={32} />
    </label>
    {error && <div className="ui-form-error">{error}</div>}
  </>
);

const SiteTaglineInput = ({ value, error = null }) => (
  <>
    <label>
      <div className="ui-form-label">Site Tagline</div>
      <input className="ui-form-input" name="tagline" type="text" required value={value} maxlength={64} />
    </label>
    {error && <div className="ui-form-error">{error}</div>}
  </>
);

const SiteDescriptionInput = ({ value, error = null }) => (
  <>
    <label>
      <div className="ui-form-label">Site Description</div>
      <textarea className="ui-form-input" name="description" required rows={4} maxlength={160}>
        {value}
      </textarea>
    </label>
    {error && <div className="ui-form-error">{error}</div>}
  </>
);

const SiteLogoInput = ({ value, error = null }) => (
  <>
    <label>
      <div className="ui-form-label">Site Logo</div>
      <img className="site-settings-logo" height="40" src={value} />
      <input className="ui-form-input" name="logo_file" type="file" accept="image/jpeg, image/png, image/gif, image/svg+xml, image/webp" />
    </label>
    {error && <div className="ui-form-error">{error}</div>}
  </>
);

const SiteFavicon = ({ value, error = null }) => (
  <>
    <label>
      <div className="ui-form-label">Site Favicon</div>
      <img className="site-settings-favicon" height="40" src={value} />
      <input className="ui-form-input" name="favicon_file" type="file" />
    </label>
    {error && <div className="ui-form-error">{error}</div>}
  </>
);

const SiteTermsOfServiceInput = ({ value, error = null }) => (
  <>
    <label className="ui-form-label">
      <span>
        {"Terms of Service "}
        {value && (
          <>
            (
            <a className="ui-link" href={value} target="_blank">
              view
            </a>
            )
          </>
        )}
      </span>
    </label>
    <input className="ui-form-input" name="terms_of_service_raw_file" type="file" accept=".txt, .md, text/markdown" />
    {error && <div className="ui-form-error">{error}</div>}
  </>
);

const SitePrivacyPolicyInput = ({ value, error = null }) => (
  <>
    <label className="ui-form-label">
      {"Privacy Policy "}
      {value && (
        <>
          (
          <a className="ui-link" href={value} target="_blank">
            view
          </a>
          )
        </>
      )}
    </label>
    <input className="ui-form-input" name="privacy_policy_raw_file" type="file" accept=".txt, .md, text/markdown" />
    {error && <div className="ui-form-error">{error}</div>}
  </>
);

const SessionExpiryInput = ({ value, error = null }) => (
  <>
    <label>
      <div className="ui-form-label">User Session Length (seconds)</div>
      <input className="ui-form-input" name="session_expiry_seconds" type="number" value={value} />
    </label>
    {error && <div className="ui-form-error">{error}</div>}
  </>
);

const OTPExpiryInput = ({ value, error = null }) => (
  <>
    <label>
      <div className="ui-form-label">Email Verification Code Expiry (seconds)</div>
      <input className="ui-form-input" name="otp_expiry_seconds" type="number" value={value} />
    </label>
    {error && <div className="ui-form-error">{error}</div>}
  </>
);
