import { Breadcrumb } from "ui/breadcrumb";
import { EditCourseForm, parseCourseForm, uploadCourseCover } from "ui/edit-course-form";
import { MainNav } from "ui/main-nav";
import { NotFoundPage } from "ui/not-found-page";
import { RootLayout } from "ui/root-layout";
import { getCurrentUser } from "lib/auth";
import { getSiteSettings, makeHtmlResponse } from "lib/cloudflare";
import { FormStatus } from "lib/constants";
import jsx from "lib/jsx";

/** TODO:
 * - [ ] Perform validation before creating course
 * - [ ] Validate the slug to ensure it contains lowecase and hyphens only
 * - [ ] Create a common path for serving files e.g. /files/a/long/key.ext?t=1243
 */

export async function onNewCourse({ request, env }) {
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

  if (request.method == "GET") {
    return makeHtmlResponse(<NewCoursePage {...baseProps} />);
  }

  const formData = await request.formData();
  const { values, errors, files } = parseCourseForm({ formData });

  if (Object.values(errors).some((value) => value)) {
    return makeHtmlResponse(
      <NewCoursePage
        {...baseProps}
        values={values}
        status={FormStatus.ERROR}
        errors={errors}
        statusMessage={"Failed to create course. Please fix the errors below."}
      />
    );
  }

  // Create the course
  const insertQuery = `INSERT INTO courses 
    (privacy, slug, title, overview, description, promo_video_url, additional_info) 
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING id`;

  let courseId;
  try {
    const insertedCourse = await database
      .prepare(insertQuery)
      .bind(
        values.privacy,
        values.slug,
        values.title,
        values.overview,
        values.description,
        values.promo_video_url,
        values.additional_info
      )
      .first();
    courseId = insertedCourse.id;
    if (!courseId) throw new Error(`Unknown error: 'courseId' is '${courseId}'.`);
  } catch (e) {
    return makeHtmlResponse(
      <NewCoursePage
        {...baseProps}
        values={values}
        status={FormStatus.ERROR}
        statusMessage={`Failed to create course. ${e.message}`}
      />
    );
  }

  const { url: cover_url, error: cover_error } = await uploadCourseCover({
    fileStore,
    courseId,
    file: files.cover_url,
  });
  if (cover_error) {
    // TODO - what to do in this case? (course created but cover not added)
    console.error("Failed to upload cover image. " + cover_error);
  } else if (cover_url) {
    const updateQuery = `UPDATE courses SET cover_url = ? WHERE id = ?`;
    try {
      await database.prepare(updateQuery).bind(cover_url, courseId).run();
    } catch (e) {
      // TODO - what do do in this case? (cover uploaded but not set in DB)
      console.error("Failed to save uploaded cover image in DB. " + e.message);
    }
  }

  return new Response(null, {
    status: 302,
    statusText: "Found",
    headers: { Location: `/manage/course/${values.slug}` },
  });
}

function NewCoursePage({
  currentUser,
  siteSettings,
  values = null,
  errors = null,
  status = null,
  statusMessage = null,
}) {
  return (
    <RootLayout
      title={`New Course - ${siteSettings.site_title}`}
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
          <h1 class="page-heading">New Course</h1>
        </header>
        <EditCourseForm
          values={values}
          errors={errors}
          status={status}
          statusMessage={statusMessage}
          submitLabel="Create Course"
          action="/manage/courses/new"
          confirmMessage="Are you sure you want to create a course with the provided information?"
        />
      </main>
    </RootLayout>
  );
}
