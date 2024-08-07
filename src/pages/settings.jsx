import { Alert, AlertVariant } from "ui/alert";
import { Breadcrumb } from "ui/breadcrumb";
import { MainNav } from "ui/main-nav";
import { NotFoundPage } from "ui/not-found-page";
import { RootLayout } from "ui/root-layout";
import { getCurrentUser, getUserEmails } from "lib/auth";
import { getSiteSettings, makeHtmlResponse, uploadFile } from "lib/cloudflare";
import { FilePrefix } from "lib/constants";
import { FormStatus } from "lib/constants";
import jsx from "lib/jsx";

/** Blog Post - Anatomy of a Form
 * 1. Decide fields and data types
 * 2. Create layout with HTML tags
 * 3. Style form with CSS rules
 * 4. Add HTML-based client side validation
 * 5. Add JS-based validation & interactivity
 * 6. Parse data & files on server
 * 7. Validate & save data on server
 * 8. Redisplay form with success or errors
 */

/**
 * TODO:
 * - [ ] Add more server-side validations
 * - [ ] Allow removing profile picture
 * - [ ] Show preview of profile picture on upload
 * - [ ] Resize avatarimage to a small size
 */

export async function onGetSettings({ request, kvStore, database }) {
  const siteSettings = await getSiteSettings({ kvStore });

  const currentUser = await getCurrentUser({ request, database });
  if (!currentUser) {
    return makeHtmlResponse(<NotFoundPage siteSettings={siteSettings} currentUser={currentUser} />);
  }
  const userEmails = await getUserEmails({ user: currentUser.id, database });

  return makeHtmlResponse(
    <AccountSettingsPage siteSettings={siteSettings} currentUser={currentUser} userEmails={userEmails} />
  );
}

export async function onPostSettings({ request, database, kvStore, fileStore }) {
  const siteSettings = await getSiteSettings({ kvStore });

  const currentUser = await getCurrentUser({ request, database });
  if (!currentUser) {
    return makeHtmlResponse(<NotFoundPage siteSettings={siteSettings} currentUser={currentUser} />);
  }
  const userEmails = await getUserEmails({ user: currentUser.id, database });

  const formData = await request.formData();
  const formErrors = {};

  const first_name = formData.get(FieldNames.first_name)?.trim();
  if (!first_name) formErrors.first_name = "First name is required.";
  const last_name = formData.get(FieldNames.last_name)?.trim() || "";

  const avatar_file = formData.get(FieldNames.avatar_url);
  let avatar_url;
  if (avatar_file) {
    const { url, error } = await uploadFile({
      fileStore,
      file: avatar_file,
      key: `${FilePrefix.AVATARS}/user-${currentUser.id}`,
      maxSize: 1 * 1024 * 1024, // 1 MB
    });
    avatar_url = url;
    if (error) formErrors.avatar_url = error;
  } else {
    avatar_url = currentUser.avatar_url;
  }

  const status = Object.values(formErrors).some((value) => value) ? FormStatus.ERROR : FormStatus.SUCCESS;
  if (status === "error") {
    return makeHtmlResponse(
      <AccountSettingsPage
        siteSettings={siteSettings}
        currentUser={currentUser}
        userEmails={userEmails}
        status={status}
        formErrors={formErrors}
      />
    );
  }

  const query = `UPDATE users SET first_name = ?, last_name = ?, avatar_url = ? WHERE id = ?`;
  await database.prepare(query).bind(first_name, last_name, avatar_url, currentUser.id).run();
  const newCurrentUser = await getCurrentUser({ database, request });
  return makeHtmlResponse(
    <AccountSettingsPage
      siteSettings={siteSettings}
      currentUser={newCurrentUser}
      userEmails={userEmails}
      status={status}
    />
  );
}

const FieldNames = {
  first_name: "first_name",
  last_name: "last_name",
  email: "email",
  avatar_url: "avatar_file",
};

const FieldLabels = {
  first_name: "First Name",
  last_name: "Last Name",
  email: "Email",
  avatar_url: "Avatar Image",
};

const FieldHints = {
  avatar_url: "JPEG, PNG, GIF, SVG or WebP image (under 2 MB)",
  email: "Your email cannot be updated.",
};

function AccountSettingsPage({ siteSettings, currentUser, userEmails, formErrors = null, status = null }) {
  return (
    <RootLayout
      title={`Account Settings - ${siteSettings.site_title}`}
      description={siteSettings.site_description}
      faviconUrl={siteSettings.favicon_url}
    >
      <MainNav
        currentUser={currentUser}
        siteTitle={siteSettings.site_title}
        logoUrl={siteSettings.site_logo_url}
      />
      <div class="container small">
        <header class="page-header">
          <Breadcrumb items={[{ label: "Home", href: "/" }]} />
          <h1 class="page-heading">Account Settings</h1>
        </header>
        <form class="form" method="post" enctype="multipart/form-data">
          <header>
            {status === FormStatus.ERROR && (
              <Alert
                title="Error"
                message="Settings were not saved. Please fix the errors."
                variant={AlertVariant.ERROR}
              />
            )}
            {status === FormStatus.SUCCESS && (
              <Alert title="Success" message="Settings saved successfully." variant={AlertVariant.SUCCESS} />
            )}
          </header>

          <fieldset>
            <label>
              <div class="form-label">{FieldLabels.first_name}</div>
              <input
                class="form-input"
                name={FieldNames.first_name}
                type="text"
                value={currentUser.first_name}
              />
            </label>
            {formErrors?.first_name && <div class="form-hint error">{formErrors?.first_name}</div>}
            <label>
              <div class="form-label">{FieldLabels.last_name}</div>
              <input
                class="form-input"
                name={FieldNames.last_name}
                type="text"
                value={currentUser.last_name}
              />
            </label>
            {formErrors?.last_name && <div class="form-hint error">{formErrors?.last_name}</div>}
            <label>
              <div class="form-label">{FieldLabels.email}</div>
              {userEmails.map((row) => (
                <input class="form-input" name={FieldNames.email} type="text" value={row.email} disabled />
              ))}
            </label>
            <div class="form-hint">{FieldHints.email}</div>
            <label>
              <div class="form-label">{FieldLabels.avatar_url}</div>
              <img class="form-round-image" height="40" src={currentUser.avatar_url} />
              <input
                class="form-input"
                name={FieldNames.avatar_url}
                type="file"
                accept="image/jpeg, image/png, image/gif, image/svg+xml, image/webp"
              />
            </label>
            {formErrors?.avatar_url ? (
              <div class="form-hint error">{formErrors?.avatar_url}</div>
            ) : (
              <div class="form-hint">{FieldHints.avatar_url}</div>
            )}
          </fieldset>
          <footer>
            <input type="submit" class="button" value="Save Settings" />
          </footer>
        </form>
      </div>
    </RootLayout>
  );
}
