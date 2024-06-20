import { FormStatus } from "lib/utils/constants";
import jsx from "lib/utils/jsx";
import { Alert, AlertVariant } from "./alert";
import { Asterisk } from "./asterisk";

export function EditCourseForm({
  values,
  errors,
  status = null,
  statusMessage = null,
  submitLabel,
  confirmMessage,
  action,
}) {
  return (
    <form
      className="ui-form"
      action={action}
      method="post"
      enctype="multipart/form-data"
      onsubmit={`return window.confirm("${confirmMessage}")`}
    >
      {status === FormStatus.ERROR && (
        <Alert title="Error" message={statusMessage} variant={AlertVariant.ERROR} />
      )}
      {status === FormStatus.SUCCESS && (
        <Alert
          title="Success"
          message="Course saved successfully."
          variant={AlertVariant.SUCCESS}
        />
      )}

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
        <input type="submit" className="ui-button" value={submitLabel} />
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
      {error ? (
        <div className="ui-form-error">{error}</div>
      ) : (
        <div className="ui-form-hint">{FieldHints.title}</div>
      )}
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
          pattern="[a-z0-9\-]*"
          required
        />
      </label>
      {error ? (
        <div className="ui-form-error">{error}</div>
      ) : (
        <div className="ui-form-hint">{FieldHints.slug}</div>
      )}
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
          {PrivacyOptions.map((op) => (
            <option value={op.value} selected={value === op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </label>
      {error && <div className="ui-form-error">{error}</div>}
    </>
  );
}

function OverviewField({ value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">{FieldLabels.overview}</div>
        <textarea
          className="ui-form-input"
          name={FieldNames.overview}
          rows={3}
          maxlength={FieldLengths.overview}
          placeholder={FieldPlaceholders.overview}
        >
          {value}
        </textarea>
      </label>
      {error ? (
        <div className="ui-form-error">{error}</div>
      ) : (
        <div className="ui-form-hint">{FieldHints.overview}</div>
      )}
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
      {error ? (
        <div className="ui-form-error">{error}</div>
      ) : (
        <div className="ui-form-hint">{FieldHints.description}</div>
      )}
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
      {error ? (
        <div className="ui-form-error">{error}</div>
      ) : (
        <div className="ui-form-hint">{FieldHints.additional_info}</div>
      )}
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
      {error ? (
        <div className="ui-form-error">{error}</div>
      ) : (
        <div className="ui-form-hint">{FieldHints.cover_url}</div>
      )}
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
      {error ? (
        <div className="ui-form-error">{error}</div>
      ) : (
        <div className="ui-form-hint">{FieldHints.promo_video_url}</div>
      )}
    </>
  );
}
