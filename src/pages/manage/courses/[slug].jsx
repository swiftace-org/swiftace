import { Breadcrumb } from "ui/breadcrumb";
import { EditCourseForm, parseCourseForm, uploadCourseCover } from "ui/edit-course-form";
import { MainNav } from "ui/main-nav";
import { NotFoundPage } from "ui/not-found-page";
import { RootLayout } from "ui/root-layout";
import { getCurrentUser } from "lib/auth";
import { getSiteSettings, makeHtmlResponse, safeguard } from "lib/cloudflare";
import { FormStatus } from "lib/constants";
import jsx from "lib/jsx";

/** TODO:
 * - [ ] Support removing cover image
 * - [ ] Add JavaScript preview
 * - [ ] Indicate when cover image is not present (and don't show error preview)
 */

export const onManageCourse = safeguard(async function ({ request, env, params }) {
  if (!["GET", "POST"].includes(request.method)) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { CACHE_KV: cacheKv, DB: database, FILE_STORE: fileStore } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });
  const baseProps = { siteSettings, currentUser };
  if (!currentUser || !currentUser?.is_admin) {
    return makeHtmlResponse(<NotFoundPage {...baseProps} />);
  }

  const courseSlug = params.slug;
  const query = `SELECT id, title, slug, privacy, overview, description, 
    cover_url, promo_video_url, additional_info 
    FROM courses 
    WHERE slug = ? 
    LIMIT 1`;
  const course = await database.prepare(query).bind(courseSlug).first();
  if (!course) {
    return makeHtmlResponse(<NotFoundPage {...baseProps} />);
  }

  baseProps.course = course;
  if (request.method === "GET") {
    return makeHtmlResponse(<ManageCoursePage {...baseProps} course={course} values={course} />);
  }

  const formData = await request.formData();
  const { values, errors, files } = parseCourseForm({ formData });

  let hasErrors = Object.values(errors).some((value) => value);
  if (!hasErrors) {
    const { url: cover_url, error: cover_url_error } = await uploadCourseCover({
      fileStore,
      courseId: course.id,
      file: files.cover_url,
    });
    values.cover_url = cover_url ?? course.cover_url;
    errors.cover_url = cover_url_error;
    hasErrors = Object.values(errors).some((value) => value);
  }

  if (hasErrors) {
    return makeHtmlResponse(
      <ManageCoursePage
        {...baseProps}
        course={course}
        values={values}
        status={FormStatus.ERROR}
        errors={errors}
        statusMessage={"Failed to save course. Please fix the errors below."}
      />
    );
  }

  let updatedCourse;
  try {
    const updateQuery = `UPDATE courses
    SET slug = ?2, privacy = ?3, title = ?4, overview = ?5, description = ?6,
      cover_url = ?7, promo_video_url = ?8, additional_info = ?9
    WHERE slug = ?1
    RETURNING id, title, slug, privacy, overview, description, 
      cover_url, promo_video_url, additional_info;`;
    updatedCourse = await database
      .prepare(updateQuery)
      .bind(
        course.slug,
        values.slug,
        values.privacy,
        values.title,
        values.overview,
        values.description,
        values.cover_url ?? null,
        values.promo_video_url,
        values.additional_info
      )
      .first();
    if (!updatedCourse) throw new Error(`Unknown error: 'updatedCouse' is '${updatedCourse}'.`);
  } catch (e) {
    return makeHtmlResponse(
      <ManageCoursePage
        {...baseProps}
        course={course}
        values={values}
        status={FormStatus.ERROR}
        statusMessage={`Failed to save course. ${e.message}`}
      />
    );
  }

  if (course.slug !== updatedCourse.slug) {
    return new Response(null, {
      status: 302,
      statusText: "Found",
      headers: { Location: `/manage/courses/${updatedCourse.slug}` },
    });
  }

  return makeHtmlResponse(
    <ManageCoursePage
      {...baseProps}
      course={updatedCourse}
      values={updatedCourse}
      status={FormStatus.SUCCESS}
      statusMessage={"Course details saved."}
    />
  );
});

function ManageCoursePage({
  siteSettings,
  currentUser,
  course,
  values,
  errors = null,
  status = null,
  statusMessage = null,
}) {
  return (
    <RootLayout
      title={`Manage Course - ${course.title} - ${siteSettings.site_title}`}
      description={siteSettings.site_description}
      faviconUrl={siteSettings.site_favicon_url}
    >
      <MainNav
        currentUser={currentUser}
        siteTitle={siteSettings.site_title}
        logoUrl={siteSettings.site_logo_url}
      />
      <main class="container small">
        <header class="page-header">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Manage", href: "/manage" },
              { label: "Courses", href: "/manage/courses" },
            ]}
          />
          <h1 class="page-heading">{course.title}</h1>
        </header>
        <EditCourseForm
          values={values}
          errors={errors}
          status={status}
          statusMessage={statusMessage}
          submitLabel="Save Course"
          action={`/manage/courses/${course.slug}`}
          confirmMessage="Are you sure you want to update the course with provided information?"
        />
      </main>
    </RootLayout>
  );
}
