import { Asterisk } from "lib/ui/asterisk";
import { Breadcrumbs } from "lib/ui/breadcrumbs";
import { MainNav } from "lib/ui/main-nav";
import { NotFoundPage } from "lib/ui/not-found-page";
import { RootLayout } from "lib/ui/root-layout";
import { getCurrentUser } from "lib/utils/auth";
import { getSiteSettings, makeHtmlResponse, safeguard } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

/** TODO:
 * - [ ] Perform validation before creating course
 * - [ ] Validate the slug to ensure it contains lowecase and hyphens only
 * - [ ] Create a common path for serving files e.g. /files/a/long/key.ext?t=1243
 */

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { CACHE_KV: cacheKv, DB: database } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });
  if (!currentUser || !currentUser?.is_admin) return makeHtmlResponse(<NotFoundPage siteSettings={siteSettings} currentUser={currentUser} />);
  return makeHtmlResponse(<NewCoursePage currentUser={currentUser} siteSettings={siteSettings} />);
});

export const onRequestPost = safeguard(async function ({ request, env }) {
  const { CACHE_KV: cacheKv, DB: database } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });
  if (!currentUser || !currentUser?.is_admin) return makeHtmlResponse(<NotFoundPage siteSettings={siteSettings} currentUser={currentUser} />);

  const formData = await request.formData();
  const formErrors = {};
  const title = formData.get(FieldNames.title)?.trim();
  if (!title) formErrors.title = "Title is required";
  const slug = formData.get(FieldNames.slug)?.trim();
  if (!slug) formErrors.slug = "Slug is required"; // todo - also validate pattern
  const privacy = formData.get(FieldNames.privacy);
  if (!privacy) formErrors.privacy = "Privacy is required"; // todo - also check valid values
  const overview = formData.get(FieldNames.overview)?.trim();
  if (!overview) formErrors.overview = "Overview is required"; // todo - also check length
  const description = formData.get(FieldNames.description)?.trim();
  const additional_info = formData.get(FieldNames.additional_info)?.trim();
  const promo_video_url = formData.get(FieldNames.promo_video_url)?.trim();
  const cover_file = formData.get(FieldNames.cover_url);

  // TODO - upload course cover image

  return makeHtmlResponse(<NewCoursePage currentUser={currentUser} siteSettings={siteSettings} />);
});

const FieldNames = {
  title: "title",
  slug: "slug",
  privacy: "privacy",
  overview: "overview",
  description: "description",
  cover_url: "cover_file",
  promo_video_url: "promo_video_url",
  additional_info: "additional_info",
};

const FieldLabels = {
  title: "Title",
  slug: "URL Slug",
  privacy: "Privacy",
  overview: "Overview",
  description: "Description",
  cover_url: "Cover Image",
  promo_video_url: "Promo Video",
  additional_info: "Additional Information",
};

const FieldPlaceholders = {
  title: "My Awesome Course",
  slug: "my-awesome-course",
  overview: "A short overview of the course",
  description: "A long description of the course",
  promo_video_url: "Enter a YouTube video URL",
  additional_info: "Additional information (resources, FAQs, etc.) for the course",
};

const FieldHints = {
  title: "Unique title for the course (under 128 characters)",
  slug: "Only lowercase letters & hyphens (under 128 characters)",
  overview: "Displayed in course card and URL previews (under 256 characters)",
  description: "Displayed at the top of the course home page (under 8,192 characters, supports markdown formatting)",
  cover_url: "Displayed on course page and in link previews",
  promo_video_url: "Displayed on course home page (YouTube video embed)",
  additional_info: "Displayed at the bottom of the course home page (under 16,384 characters, supports markdown formatting)",
};

const FieldLengths = {
  title: 128,
  slug: 128,
  overview: 256,
  description: 8192,
  cover_url: 1024, // not used here??
  promo_video_url: 1024,
  additional_info: 16384,
};

function NewCoursePage({ currentUser, siteSettings, values = null, errors = null }) {
  return (
    <RootLayout
      title={`New Course - ${siteSettings.site_title}`}
      description={siteSettings.site_description}
      faviconUrl={siteSettings.site_favicon_url}
      styles={["ui"]}
    >
      <MainNav currentUser={currentUser} siteTitle={siteSettings.site_title} logoUrl={siteSettings.site_logo_url} />
      <main className="ui-container-sm">
        <header className="ui-page-header">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Manage", href: "/manage" },
              { label: "Courses", href: "/manage/courses" },
            ]}
          />
          <h1 className="ui-page-heading">New Course</h1>
        </header>
        <form
          className="ui-form"
          action="/"
          method="post"
          enctype="multipart/form-data"
          onsubmit="return window.confirm('Are you sure you want to create a course with the provided information?')"
        >
          <fieldset>
            <TitleField value={values?.title} error={errors?.title} />
            <SlugField value={values?.slug} error={errors?.slug} />
            <PrivacyField value={values?.privacy} error={errors?.slug} />
            <OverviewField value={values?.overview} error={errors?.slug} />
            <CoverImageField value={values?.cover_url} error={errors?.slug} />
            <PromoVideoField value={values?.promo_video_url} error={errors?.promo_video_url} />
            <DescriptionField value={values?.description} error={errors?.description} />
            <AdditionalInfo value={values?.additional_info} error={errors?.additional_info} />
          </fieldset>
          <footer>
            <input type="submit" className="ui-button" value="Create Course" />
          </footer>
        </form>
      </main>
    </RootLayout>
  );
}

function TitleField({ value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">
          {FieldLabels.title}
          <Asterisk />
        </div>
        <input
          className="ui-form-input"
          name={FieldNames.title}
          type="text"
          value={value}
          placeholder={FieldPlaceholders.title}
          maxlength={FieldLengths.title}
          required
        />
      </label>
      {error ? <div className="ui-form-error">{error}</div> : <div className="ui-form-hint">{FieldHints.title}</div>}
    </>
  );
}

function SlugField({ value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">
          {FieldLabels.slug}
          <Asterisk />
        </div>
        <input
          className="ui-form-input"
          name={FieldNames.slug}
          type="text"
          value={value}
          placeholder={FieldPlaceholders.slug}
          maxlength={FieldLengths.slug}
          pattern="[a-z\-]*"
          required
        />
      </label>
      {error ? <div className="ui-form-error">{error}</div> : <div className="ui-form-hint">{FieldHints.slug}</div>}
    </>
  );
}

function PrivacyField({ value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">
          {FieldLabels.privacy}
          <Asterisk />
        </div>
        <select className="ui-form-input" name={FieldNames.privacy} required>
          <option value="">Select course privacy</option>
          <option value="PRIVATE">Private - Only admins can access</option>
          <option value="UNLISTED">Unlisted - Anyone with a link can access</option>
          <option value="PUBLIC">Public - Anyone can access from home page</option>
        </select>
      </label>
    </>
  );
}

function OverviewField({ value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">
          {FieldLabels.overview}
          <Asterisk />
        </div>
        <textarea
          className="ui-form-input"
          name={FieldNames.overview}
          required
          rows={3}
          maxlength={FieldLengths.overview}
          placeholder={FieldPlaceholders.overview}
        >
          {value}
        </textarea>
      </label>
      {error ? <div className="ui-form-error">{error}</div> : <div className="ui-form-hint">{FieldHints.overview}</div>}
    </>
  );
}

function DescriptionField({ value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">{FieldLabels.description}</div>
        <textarea
          className="ui-form-input"
          name={FieldNames.description}
          rows={5}
          maxlength={FieldLengths.description}
          placeholder={FieldPlaceholders.description}
        >
          {value}
        </textarea>
      </label>
      {error ? <div className="ui-form-error">{error}</div> : <div className="ui-form-hint">{FieldHints.description}</div>}
    </>
  );
}

function AdditionalInfo({ value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">{FieldLabels.additional_info}</div>
        <textarea
          className="ui-form-input"
          name={FieldNames.additional_info}
          rows={5}
          maxlength={FieldLengths.additional_info}
          placeholder={FieldPlaceholders.additional_info}
        >
          {value}
        </textarea>
      </label>
      {error ? <div className="ui-form-error">{error}</div> : <div className="ui-form-hint">{FieldHints.additional_info}</div>}
    </>
  );
}

function CoverImageField({ value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">{FieldLabels.cover_url}</div>
        <img src={value} /> {/* TODO - add styles here */}
        <input className="ui-form-input" name={FieldNames.cover_url} type="file" />
      </label>
      {error ? <div className="ui-form-error">{error}</div> : <div className="ui-form-hint">{FieldHints.cover_url}</div>}
    </>
  );
}

function PromoVideoField({ value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">{FieldLabels.promo_video_url}</div>
        <input
          className="ui-form-input"
          name={FieldNames.promo_video_url}
          type="url"
          value={value}
          placeholder={FieldPlaceholders.promo_video_url}
          maxlength={FieldLengths.promo_video_url}
        />
      </label>
      {error ? <div className="ui-form-error">{error}</div> : <div className="ui-form-hint">{FieldHints.promo_video_url}</div>}
    </>
  );
}
