import { Breadcrumb } from "ui/breadcrumb";
import { NotFoundPage } from "ui/not-found-page";
import { Outlink } from "ui/outlink";
import { PrivacyDisplay } from "lib/constants";
import { MainNav } from "ui/main-nav";
import { RootLayout } from "ui/root-layout";
import { getCurrentUser } from "lib/auth";
import { getSiteSettings, makeHtmlResponse } from "lib/cloudflare";
import jsx from "lib/jsx";

/** TODO:
 * - [ ] Add pagiation beyond 1000 courses (at some point)
 * - [ ] Write a blog post on drag drop with pure JavaScript
 */

export async function onGetManageCourses({ request, kvStore, database }) {
  if (!["GET", "POST"].includes(request.method)) {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const siteSettings = await getSiteSettings({ kvStore });
  const currentUser = await getCurrentUser({ request, database });
  const baseProps = { siteSettings, currentUser };
  if (!currentUser || !currentUser?.is_admin) return makeHtmlResponse(<NotFoundPage {...baseProps} />);
  const courses = await selectCoursesForAdmin({ database });

  if (request.method == "GET") {
    return makeHtmlResponse(<ManageCoursesPage {...baseProps} courses={courses} />);
  }

  // TODO - [ ] handle the case where form data does not contain sort order

  const formData = await request.formData();
  const courseIds = courses.map((c) => c.id);
  const newSortedCourseIds = formData
    .get("sorted_course_ids")
    ?.trim()
    .split(",")
    .map((idStr) => parseInt(idStr))
    .filter((id) => courseIds.includes(id));
  const newSortOrders = courseIds
    .map((id) => newSortedCourseIds.indexOf(id))
    .map((x) => (x === -1 ? null : x));

  const values = courseIds.map((id, i) => `(${id}, ${newSortOrders[i]})`).join(", ");

  const query = `WITH idso(id, sort_order) AS (VALUES ${values})
    UPDATE courses
    SET sort_order = idso.sort_order
    FROM idso
    WHERE courses.id = idso.id;
  `;

  await database.prepare(query).run();
  const newCourses = await selectCoursesForAdmin({ database });

  // TODO - Show success message that courses were sorted

  return makeHtmlResponse(
    <ManageCoursesPage siteSettings={siteSettings} currentUser={currentUser} courses={newCourses} />
  );
}

function ManageCoursesPage({ siteSettings, currentUser, courses }) {
  return (
    <RootLayout
      title={`Manage Courses - ${siteSettings.site_title}`}
      description={siteSettings.site_description}
      faviconUrl={siteSettings.site_favicon_url}
      styles={["ui", "manage-courses"]}
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
            ]}
          />
          <h1 class="page-heading">Courses</h1>
        </header>
        <section class="page-section">
          <table class="table manage-courses-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Privacy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr data-course-id={course.id}>
                  <td>
                    <span class="manage-courses-drag-handle">⋮⋮</span> {course.id}
                  </td>
                  <td>{course.title}</td>
                  <td>{PrivacyDisplay[course.privacy]}</td>
                  <td>
                    <ul class="manage-courses-actions">
                      <li>
                        <Outlink href={`/course/${course.slug}`}>View</Outlink>
                      </li>
                      <li>
                        <a className="link" href={`/manage/courses/${course.slug}`}>
                          Manage
                        </a>
                      </li>
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div class="button-row manage-courses-default-buttons">
            <button class="button outline wide" onclick="ManageCourses.enableReorder(event);">
              ⋮⋮ Reorder
            </button>
            <a href={`/manage/courses/new`} class="button outline wide">
              + New Course
            </a>
          </div>
          <div class="button-row manage-courses-ordering-buttons">
            <a href={`/manage/courses`} class="button outline wide">
              ✕ Reset Order
            </a>
            <form action="/manage/courses" method="post">
              <input type="hidden" name="sorted_course_ids" value="" />
              <input type="submit" class="button outline wide" value="⋮⋮ Save Order" />
            </form>
          </div>
        </section>
      </main>
    </RootLayout>
  );
}

async function selectCoursesForAdmin({ database }) {
  const query = `SELECT id, slug, title, privacy, sort_order FROM courses LIMIT 1000;`;
  const queryOutput = await database.prepare(query).all();
  return sortCourses({ courses: queryOutput.results });
}

function sortCourses({ courses }) {
  courses.sort((a, b) => {
    if (a.sort_order == null && b.sort_order == null) return 0;
    if (a.sort_order == null) return 1;
    if (b.sort_order == null) return -1;
    return a.sort_order - b.sort_order;
  });
  return courses;
}
