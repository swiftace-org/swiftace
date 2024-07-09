import { Alert } from "lib/ui/alert";
import { Breadcrumb } from "lib/ui/breadcrumb";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { assert, validateSameKeys } from "lib/utils/validation";
import { getCurrentUser } from "lib/utils/auth";
import {
  assertSiteSettings,
  getSiteSettings,
  makeHtmlResponse,
  safeguard,
  uploadFile,
} from "lib/utils/cloudflare";
import { SiteAssetFilename } from "lib/utils/constants";
import { CachePrefix } from "lib/utils/constants";
import { FilePrefix } from "lib/utils/constants";
import { FormStatus } from "lib/utils/constants";
import jsx from "lib/utils/jsx";
import { Outlink } from "lib/ui/outlink";

/** TODO:
 * - [ ] Add a .ui-form-field enclosing div to control label & input widths
 * - [ ] Refactor ui-form-input CSS to remove flex layout from labels (also refactor login page accordingly)
 * - [ ] Show preview logo & favicon images on upload (client-side JS)
 * - [ ] Validate file sizes before form submission (show error alert box or just window.alert)
 * - [ ] Validate text fields on server side (in case form was submitted directly using POST)
 * - [ ] Add a dismiss button to the success alert
 * - [ ] Indicate if terms of service and privacy policy have not been set
 * - [ ] Show not found page with proper styling
 * - [ ] Add file type checks on server side too
 * - [ ] Extract file types and file sizes into common components
 * - [ ] Add alt text for images
 * - [ ] Overwrite with default setting if an invalid setting is found
 * - [ ] Resize large images to make them smaller to serve
 * - [ ] Maybe look into using cloudflare images for image serving (??)
 */

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv } = env;
  const currentUser = await getCurrentUser({ request, database });
  if (!currentUser || !currentUser?.is_admin) return makeHtmlResponse(<div>Not Found</div>);

  const siteSettings = await getSiteSettings({ cacheKv });
  return makeHtmlResponse(<SiteSettingsPage siteSettings={siteSettings} currentUser={currentUser} />);
});

export const onRequestPost = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv, FILE_STORE: fileStore } = env;
  const currentUser = await getCurrentUser({ request, database });
  if (!currentUser || !currentUser?.is_admin) return makeHtmlResponse(<div>Not Found</div>);

  const siteSettings = await getSiteSettings({ cacheKv });
  const formData = await request.formData();

  const [
    { url: favicon_url, error: favicon_error },
    { url: logo_url, error: logo_error },
    { url: terms_of_service_raw_url, error: terms_of_service_error },
    { url: privacy_policy_raw_url, error: privacy_policy_error },
  ] = await Promise.all([
    uploadFile({
      fileStore,
      key: `${FilePrefix.ASSETS}/${SiteAssetFilename.site_favicon}`,
      file: formData.get(FieldNames.site_favicon),
      maxSize: 100 * 1024,
    }),
    uploadFile({
      fileStore,
      key: `${FilePrefix.ASSETS}/${SiteAssetFilename.site_logo}`,
      file: formData.get(FieldNames.site_logo),
      maxSize: 2 * 1024 * 1024,
    }),
    uploadFile({
      fileStore,
      key: `${FilePrefix.ASSETS}/${SiteAssetFilename.terms_of_service}`,
      file: formData.get(FieldNames.terms_of_service),
      maxSize: 1024 * 1024,
    }),
    uploadFile({
      fileStore,
      key: `${FilePrefix.ASSETS}/${SiteAssetFilename.privacy_policy}`,
      file: formData.get(FieldNames.privacy_policy),
      maxSize: 1024 * 1024,
    }),
  ]);

  const newSettings = {
    site_title: formData.get(FieldNames.site_title)?.trim() ?? siteSettings.site_title,
    site_tagline: formData.get(FieldNames.site_tagline)?.trim() ?? siteSettings.site_tagline,
    site_description: formData.get(FieldNames.site_description)?.trim() ?? siteSettings.site_description,
    site_favicon_url: favicon_url ?? siteSettings.site_favicon_url,
    site_logo_url: logo_url ?? siteSettings.site_logo_url,
    terms_of_service_raw_url: terms_of_service_raw_url ?? siteSettings.terms_of_service_raw_url,
    privacy_policy_raw_url: privacy_policy_raw_url ?? siteSettings.privacy_policy_raw_url,
    session_expiry_seconds:
      parseInt(formData.get(FieldNames.session_expiry_seconds)?.trim()) ??
      siteSettings.session_expiry_seconds,
    otp_expiry_seconds:
      parseInt(formData.get(FieldNames.otp_expiry_seconds)?.trim()) ?? siteSettings.otp_expiry_seconds,
  };
  assertSiteSettings(
    "POST /site-settings",
    newSettings,
    `'newSiteSettings' is invalid.\n\n${JSON.stringify(newSettings, null, 2)}\n`
  );

  const errors = {
    site_title: null,
    site_tagline: null,
    site_description: null,
    site_favicon_url: favicon_error,
    site_logo_url: logo_error,
    terms_of_service_raw_url: terms_of_service_error,
    privacy_policy_raw_url: privacy_policy_error,
    session_expiry_seconds: null,
    otp_expiry_seconds: null,
  };
  assert(
    "POST /site-settings",
    validateSameKeys(newSettings, errors),
    `'newSettings' and 'errors' must have the same keys. \nnewSettings: ${Object.keys(newSettings).join(
      ", "
    )}\nerrors:: ${Object.keys(errors).join(", ")}`
  );

  const status = Object.values(errors).some((value) => value) ? FormStatus.ERROR : FormStatus.SUCCESS;

  await cacheKv.put(CachePrefix.SITE_SETTINGS, JSON.stringify(newSettings));
  return makeHtmlResponse(
    <SiteSettingsPage siteSettings={newSettings} errors={errors} currentUser={currentUser} status={status} />
  );
});

function SiteSettingsPage({ siteSettings: S, currentUser, errors: E = null, status = null }) {
  return (
    <RootLayout
      title={`Site Settings - ${S.site_title}`}
      description={S.site_description}
      faviconUrl={S.site_favicon_url}
    >
      <MainNav siteTitle={S.site_title} logoUrl={S.site_logo_url} currentUser={currentUser} />
      <main class="container small">
        <header class="page-header">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Manage", href: "/manage" },
            ]}
          />
          <h1 class="page-heading">Site Settings</h1>
        </header>
        <form
          class="form"
          method="post"
          enctype="multipart/form-data"
          onsubmit="return window.confirm('Are you sure you want to save the site settings?')"
        >
          <header>
            {status === FormStatus.ERROR && (
              <Alert
                title="Error"
                message="Some settings were not saved. Please fix the errors."
                variant="error"
              />
            )}
            {status === FormStatus.SUCCESS && (
              <Alert title="Success" message="Settings saved successfully." variant="success" />
            )}
          </header>
          <fieldset>
            <SiteTitleInput value={S.site_title} error={E?.site_title} />
            <SiteTaglineInput value={S.site_tagline} error={E?.site_tagline} />
            <SiteDescriptionInput value={S.site_description} error={E?.site_description} />
            <SiteLogoFileInput value={S.site_logo_url} error={E?.site_logo_url} />
            <SiteFaviconFileInput value={S.site_favicon_url} error={E?.site_favicon_url} />
            <TermsOfServiceFileInput value={S.terms_of_service_raw_url} />
            <PrivacyPolicyFileInput value={S.privacy_policy_raw_url} />
            <SessionExpiryInput value={S.session_expiry_seconds} />
            <OTPExpiryInput value={S.otp_expiry_seconds} />
          </fieldset>
          <footer>
            <input type="submit" class="button" value="Save Settings" />
          </footer>
        </form>
      </main>
    </RootLayout>
  );
}

const FieldNames = {
  site_title: "site_title",
  site_tagline: "site_tagline",
  site_description: "site_desription",
  site_favicon: "site_favicon_file",
  site_logo: "site_logo_file",
  terms_of_service: "terms_of_service_raw_file",
  privacy_policy: "privacy_policy_raw_file",
  session_expiry_seconds: "session_expiry_seconds",
  otp_expiry_seconds: "otp_expiry_seconds",
};

const FieldLabels = {
  site_title: "Site Title",
  site_tagline: "Site Tagline",
  site_description: "Site Description",
  site_favicon_url: "Site Favicon",
  site_logo_url: "Site Logo",
  terms_of_service_raw_url: "Terms of Service",
  privacy_policy_raw_url: "Privacy Policy",
  session_expiry_seconds: "User Session Length (seconds)",
  otp_expiry_seconds: "Verification Code Expiry (seconds)",
};

const FieldHints = {
  site_title: "Displayed on browser tab (under 32 characters)",
  site_tagline: "Displayed on home page (under 64 characters)",
  site_description: "Displayed in link previews (under 160 characters)",
  site_favicon_url: "Square ICO, PNG, GIF, or SVG image (under 100 KB)",
  site_logo_url: "JPEG, PNG, GIF, SVG or WebP image (under 2 MB)",
  terms_of_service_raw_url: "Text or markdown formatted file (under 1 MB)",
  privacy_policy_raw_url: "Text or markdown formatted file (under 1 MB)",
  session_expiry_seconds: "Duration after which user is automatically logged out",
  otp_expiry_seconds: "Expiry duration for email verification codes",
};

const SiteTitleInput = ({ value, error = null }) => (
  <>
    <label>
      <div class="form-label">{FieldLabels.site_title}</div>
      <input
        class="form-input"
        name={FieldNames.site_title}
        type="text"
        required
        value={value}
        maxlength={32}
      />
    </label>
    {error ? (
      <div class="form-hint error">{error}</div>
    ) : (
      <div class="form-hint">{FieldHints.site_title}</div>
    )}
  </>
);

const SiteTaglineInput = ({ value, error = null }) => (
  <>
    <label>
      <div class="form-label">{FieldLabels.site_tagline}</div>
      <input
        class="form-input"
        name={FieldNames.site_tagline}
        type="text"
        required
        value={value}
        maxlength={64}
      />
    </label>
    {error ? (
      <div class="form-hint error">{error}</div>
    ) : (
      <div class="form-hint">{FieldHints.site_tagline}</div>
    )}
  </>
);

const SiteDescriptionInput = ({ value, error = null }) => (
  <>
    <label>
      <div class="form-label">{FieldLabels.site_description}</div>
      <textarea class="form-input" name={FieldNames.site_description} required rows={3} maxlength={160}>
        {value}
      </textarea>
    </label>
    {error ? (
      <div class="form-hint error">{error}</div>
    ) : (
      <div class="form-hint">{FieldHints.site_description}</div>
    )}
  </>
);

function SiteLogoFileInput({ value, error = null }) {
  return (
    <>
      <label>
        <div class="form-label">{FieldLabels.site_logo_url}</div>
        <img class="form-image small" height="64" src={value} />
        <input
          class="form-input"
          name={FieldNames.site_logo}
          type="file"
          accept="image/jpeg, image/png, image/gif, image/svg+xml, image/webp"
        />
      </label>

      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.site_logo_url}</div>
      )}
    </>
  );
}

function SiteFaviconFileInput({ value, error = null }) {
  return (
    <>
      <label>
        <div class="form-label">{FieldLabels.site_favicon_url}</div>
        <img class="form-image tiny" height="32" src={value} />
        <input
          class="form-input"
          name={FieldNames.site_favicon}
          type="file"
          accept="image/png, image/gif, image/svg+xml, image/x-icon"
        />
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.site_favicon_url}</div>
      )}
    </>
  );
}

function TermsOfServiceFileInput({ value, error = null }) {
  return (
    <>
      <label>
        <div class="form-label">
          {FieldLabels.terms_of_service_raw_url}
          &nbsp;
          {value && (
            <>
              (<Outlink href={value}>view</Outlink>)
            </>
          )}
        </div>
        <input
          class="form-input"
          name={FieldNames.terms_of_service}
          type="file"
          accept=".txt, .md, text/markdown"
        />
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.terms_of_service_raw_url}</div>
      )}
    </>
  );
}

function PrivacyPolicyFileInput({ value, error = null }) {
  return (
    <>
      <label>
        <div class="form-label">
          {FieldLabels.privacy_policy_raw_url}
          &nbsp;
          {value && (
            <>
              (<Outlink href={value}>view</Outlink>)
            </>
          )}
        </div>
        <input
          class="form-input"
          name={FieldNames.privacy_policy}
          type="file"
          accept=".txt, .md, text/markdown"
        />
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.privacy_policy_raw_url}</div>
      )}
    </>
  );
}

function SessionExpiryInput({ value, error = null }) {
  return (
    <>
      <label>
        <div class="form-label">{FieldLabels.session_expiry_seconds}</div>
        <input class="form-input" name={FieldNames.session_expiry_seconds} type="number" value={value} />
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.session_expiry_seconds}</div>
      )}
    </>
  );
}

function OTPExpiryInput({ value, error = null }) {
  return (
    <>
      <label>
        <div class="form-label">{FieldLabels.otp_expiry_seconds}</div>
        <input class="form-input" name={FieldNames.otp_expiry_seconds} type="number" value={value} />
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.otp_expiry_seconds}</div>
      )}
    </>
  );
}
