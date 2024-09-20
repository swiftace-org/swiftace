import { FilePrefix, FormStatus } from "lib/constants";
import jsx from "lib/jsx";
import { Alert, AlertVariant } from "./alert";
import { Asterisk } from "./asterisk";
import { uploadFile } from "lib/cloudflare";
import { assert, isNonEmptyString, isObject, undefinedOrNull } from "lib/assertion";

/** TODO
 * - [ ] Show a preview/link to existing video
 * - [ ] Update uploaded images using JavaScript
 * - [ ] Do you need deeper assertions for value (e.g. non-empty string, conforming to pattern, etc.)
 */

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function EditCourseForm({
  action,
  values,
  errors,
  submitLabel,
  status = null,
  statusMessage = null,
  confirmMessage = null,
}) {
  const tag = "EditCourseForm";
  assert({
    tag,
    check: isNonEmptyString(action, { trime: true }),
    error: "'action' must be a non-empty string",
    data: { action },
  });
  assert({
    tag,
    check: undefinedOrNull(values) || isObject(values),
    error: "'values' must be undefined/null or an object",
    data: { values },
  });
  assert({
    tag,
    check: undefinedOrNull(errors) || isObject(errors),
    error: "'errors' must be undefined/null or an object",
    data: { errors },
  });
  assert({
    tag,
    check: isNonEmptyString(submitLabel, { trim: true }),
    error: "'submitLabel' must be a non-empty string",
    data: { submitLabel },
  });
  assert({
    tag,
    check: undefinedOrNull(confirmMessage) || isNonEmptyString(confirmMessage),
    error: "'confirmMessage' must be undefined/null or a non-empty string",
  });
  const statusAllowedValues = Object.values(FormStatus);
  assert({
    tag,
    check:
      (undefinedOrNull(status) && undefinedOrNull(statusMessage)) ||
      (statusAllowedValues.includes(status) && isNonEmptyString(statusMessage, { trim: true })),
    error:
      "'status' and 'statusMessage' must both be empty, or 'status' must be an allowed value and 'statusMessage' a non-empty string",
    data: { status, statusAllowedValues, statusMessage },
  });
  return (
    <form
      class="form"
      action={action}
      method="post"
      enctype="multipart/form-data"
      onsubmit={confirmMessage && `return window.confirm(${JSON.stringify(escapeHtml(confirmMessage))})`}
    >
      <header>
        {status === FormStatus.ERROR && (
          <Alert title="Error" message={statusMessage} variant={AlertVariant.ERROR} />
        )}
        {status === FormStatus.SUCCESS && (
          <Alert title="Success" message={statusMessage} variant={AlertVariant.SUCCESS} />
        )}
      </header>

      <fieldset>
        <TitleField value={values?.title} error={errors?.title} />
        <SlugField value={values?.slug} error={errors?.slug} />
        <PrivacyField value={values?.privacy} error={errors?.slug} />
        <OverviewField value={values?.overview} error={errors?.slug} />
        <CoverImageField value={values?.cover_url} error={errors?.slug} />
        <PromoVideoField value={values?.promo_video_url} error={errors?.promo_video_url} />
        <DescriptionField value={values?.description} error={errors?.description} />
        <AdditionalInfoField value={values?.additional_info} error={errors?.additional_info} />
      </fieldset>
      <footer>
        <input type="submit" class="button" value={submitLabel} />
      </footer>
    </form>
  );
}

export function parseCourseForm({ formData }) {
  const values = {
    title: formData.get(FieldNames.title)?.trim(),
    slug: formData.get(FieldNames.slug)?.trim(),
    privacy: formData.get(FieldNames.privacy),
    overview: formData.get(FieldNames.overview)?.trim(),
    description: formData.get(FieldNames.description)?.trim(),
    additional_info: formData.get(FieldNames.additional_info)?.trim(),
    promo_video_url: formData.get(FieldNames.promo_video_url)?.trim(),
  };

  const files = { cover_url: formData.get(FieldNames.cover_url) };

  const errors = {};
  if (!values.title) errors.title = "Title is required";
  if (!values.slug) errors.slug = "Slug is required"; // todo - also validate pattern
  if (!values.privacy) errors.privacy = "Privacy is required"; // todo - also check valid values

  return { values, errors, files };
}

export async function uploadCourseCover({ fileStore, courseId, file }) {
  // TODO - Validate file dimensions
  return uploadFile({
    fileStore,
    key: `${FilePrefix.COURSES}/${courseId}/cover`,
    file,
    maxSize: 2 * 1024 * 1024,
  });
}

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
  description:
    "Displayed at the top of the course home page (under 8,192 characters, supports markdown formatting)",
  cover_url: "JPEG, PNG, WEBP or GIF (1200 x 628 px, under 2 MB)",
  promo_video_url: "Displayed on course home page (YouTube video embed)",
  additional_info:
    "Displayed at the bottom of the course home page (under 16,384 characters, supports markdown formatting)",
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

const PrivacyOptions = [
  { value: "", label: "Select who can access the course" },
  { value: "PRIVATE", label: "Private - Only admins can access" },
  { value: "UNLISTED", label: "Unlisted - Anyone with a link can access" },
  { value: "PUBLIC", label: "Public - Anyone can access from home page" },
];

function TitleField({ value, error }) {
  const tag = "TitleField";
  assert({
    tag,
    check: undefinedOrNull(value) || typeof value == "string",
    error: "'value' must be undefined/null or a string",
    data: { value },
  });
  assert({
    tag,
    check: undefinedOrNull(error) || typeof error == "string",
    error: "'error' must be undefined/null or a string",
    data: { error },
  });
  return (
    <>
      <label>
        <div class="form-label">
          {FieldLabels.title}
          <Asterisk />
        </div>
        <input
          class="form-input"
          name={FieldNames.title}
          type="text"
          value={value}
          placeholder={FieldPlaceholders.title}
          maxlength={FieldLengths.title}
          required
        />
      </label>
      {error ? <div class="form-hint error">{error}</div> : <div class="form-hint">{FieldHints.title}</div>}
    </>
  );
}

function SlugField({ value, error }) {
  const tag = "SlugField";
  assert({
    tag,
    check: undefinedOrNull(value) || typeof value == "string",
    error: "'value' must be undefined/null or a string",
    data: { value },
  });
  assert({
    tag,
    check: undefinedOrNull(error) || typeof error == "string",
    error: "'error' must be undefined/null or a string",
    data: { error },
  });
  return (
    <>
      <label>
        <div class="form-label">
          {FieldLabels.slug}
          <Asterisk />
        </div>
        <input
          class="form-input"
          name={FieldNames.slug}
          type="text"
          value={value}
          placeholder={FieldPlaceholders.slug}
          maxlength={FieldLengths.slug}
          pattern="[a-z0-9\-]*"
          required
        />
      </label>
      {error ? <div class="form-hint error">{error}</div> : <div class="form-hint">{FieldHints.slug}</div>}
    </>
  );
}

function PrivacyField({ value, error }) {
  const tag = "PrivacyField";
  assert({
    tag,
    check: undefinedOrNull(value) || PrivacyOptions.some((op) => op.value === value),
    error: "'value' must be undefined/null or one the allowed privacy options",
    data: { value, PrivacyOptions },
  });
  assert({
    tag,
    check: undefinedOrNull(error) || typeof error == "string",
    error: "'error' must be undefined/null or a string",
    data: { error },
  });
  return (
    <>
      <label>
        <div class="form-label">
          {FieldLabels.privacy}
          <Asterisk />
        </div>
        <select class="form-input" name={FieldNames.privacy} required>
          {PrivacyOptions.map((op) => (
            <option value={op.value} selected={value === op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </label>
      {error && <div class="form-hint error">{error}</div>}
    </>
  );
}

function OverviewField({ value, error }) {
  const tag = "OverviewField";
  assert({
    tag,
    check: undefinedOrNull(value) || typeof value == "string",
    error: "'value' must be undefined/null or a string",
    data: { value },
  });
  assert({
    tag,
    check: undefinedOrNull(error) || typeof error == "string",
    error: "'error' must be undefined/null or a string",
    data: { error },
  });

  return (
    <>
      <label>
        <div class="form-label">{FieldLabels.overview}</div>
        <textarea
          class="form-input"
          name={FieldNames.overview}
          rows={3}
          maxlength={FieldLengths.overview}
          placeholder={FieldPlaceholders.overview}
        >
          {value}
        </textarea>
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.overview}</div>
      )}
    </>
  );
}

function DescriptionField({ value, error }) {
  const tag = "DescriptionField";
  assert({
    tag,
    check: undefinedOrNull(value) || typeof value == "string",
    error: "'value' must be undefined/null or a string",
    data: { value },
  });
  assert({
    tag,
    check: undefinedOrNull(error) || typeof error == "string",
    error: "'error' must be undefined/null or a string",
    data: { error },
  });
  return (
    <>
      <label>
        <div class="form-label">{FieldLabels.description}</div>
        <textarea
          class="form-input"
          name={FieldNames.description}
          rows={5}
          maxlength={FieldLengths.description}
          placeholder={FieldPlaceholders.description}
        >
          {value}
        </textarea>
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.description}</div>
      )}
    </>
  );
}

function AdditionalInfoField({ value, error }) {
  const tag = "AdditionalInfo";
  assert({
    tag,
    check: undefinedOrNull(value) || typeof value == "string",
    error: "'value' must be undefined/null or a string",
    data: { value },
  });
  assert({
    tag,
    check: undefinedOrNull(error) || typeof error == "string",
    error: "'error' must be undefined/null or a string",
    data: { error },
  });
  return (
    <>
      <label>
        <div class="form-label">{FieldLabels.additional_info}</div>
        <textarea
          class="form-input"
          name={FieldNames.additional_info}
          rows={5}
          maxlength={FieldLengths.additional_info}
          placeholder={FieldPlaceholders.additional_info}
        >
          {value}
        </textarea>
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.additional_info}</div>
      )}
    </>
  );
}

function CoverImageField({ value, error }) {
  const tag = "CoverImageField";
  assert({
    tag,
    check: undefinedOrNull(value) || typeof value == "string",
    error: "'value' must be undefined/null or a string",
    data: { value },
  });
  assert({
    tag,
    check: undefinedOrNull(error) || typeof error == "string",
    error: "'error' must be undefined/null or a string",
    data: { error },
  });

  return (
    <>
      <label>
        <div class="form-label">{FieldLabels.cover_url}</div>
        <img class="form-image-preview" title={value} alt={value} src={value} />
        <input class="form-input" name={FieldNames.cover_url} type="file" />
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.cover_url}</div>
      )}
    </>
  );
}

function PromoVideoField({ value, error }) {
  const tag = "PromoVideoField";
  assert({
    tag,
    check: undefinedOrNull(value) || typeof value == "string",
    error: "'value' must be undefined/null or a string",
    data: { value },
  });
  assert({
    tag,
    check: undefinedOrNull(error) || typeof error == "string",
    error: "'error' must be undefined/null or a string",
    data: { error },
  });
  return (
    <>
      <label>
        <div class="form-label">{FieldLabels.promo_video_url}</div>
        <input
          class="form-input"
          name={FieldNames.promo_video_url}
          type="url"
          value={value}
          placeholder={FieldPlaceholders.promo_video_url}
          maxlength={FieldLengths.promo_video_url}
        />
      </label>
      {error ? (
        <div class="form-hint error">{error}</div>
      ) : (
        <div class="form-hint">{FieldHints.promo_video_url}</div>
      )}
    </>
  );
}
