import { NotFoundPage } from "lib/ui/not-found-page";
import { PrivacyDisplay } from "lib/utils/constants";

const { MainNav } = require("lib/ui/main-nav");
const { RootLayout } = require("lib/ui/root-layout");
const { getCurrentUser } = require("lib/utils/auth");
const { safeguard, getSiteSettings, makeHtmlResponse } = require("lib/utils/cloudflare");
const { default: jsx } = require("lib/utils/jsx");

/** TODO:
 * - [ ] Add pagiation beyond 1000 courses (at some point)
 */

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { CACHE_KV: cacheKv, DB: database } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });
  if (!currentUser || !currentUser?.is_admin) return makeHtmlResponse(<NotFoundPage siteSettings={siteSettings} currentUser={currentUser} />);
  const courses = await selectCoursesForAdmin({ database });

  return makeHtmlResponse(<ManageCoursesPage siteSettings={siteSettings} currentUser={currentUser} courses={courses} />);
});

function ManageCoursesPage({ siteSettings, currentUser, courses }) {
  return (
    <RootLayout
      title={`Manage Courses - ${siteSettings.site_title}`}
      description={siteSettings.site_description}
      faviconUrl={siteSettings.site_favicon_url}
      styles={["ui", "manage-courses"]}
    >
      <MainNav currentUser={currentUser} siteTitle={siteSettings.site_title} logoUrl={siteSettings.site_logo_url} />
      <main className="ui-container">
        <header className="ui-page-header">
          <h1 className="ui-page-heading">Manage Courses</h1>
        </header>
        <section>
          <table className="manage-courses-table">
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
                <tr>
                  <td>{course.id}</td>
                  <td>{course.title}</td>
                  <td>{PrivacyDisplay[course.privacy]}</td>
                  <td>
                    <ul className="manage-courses-actions">
                      <li>
                        <a className="ui-link" href={`/course/${course.slug}`} target="_blank">
                          View
                        </a>
                      </li>
                      <li>
                        <a className="ui-link" href={`/course/${course.slug}/manage`}>
                          Manage
                        </a>
                      </li>
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <a href={`/manage/courses/new`} className="ui-button">
            + New Course
          </a>
        </section>
      </main>
    </RootLayout>
  );
}

async function selectCoursesForAdmin({ database }) {
  const query = `SELECT id, slug, title, privacy, sort_order FROM courses LIMIT 1000;`;
  const queryOutput = await database.prepare(query).all();
  return queryOutput.results;
}
