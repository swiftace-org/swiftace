import { CourseCard } from "lib/ui/course-card";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { getCurrentUser } from "lib/utils/auth";
import { getSiteSettings, makeHtmlResponse, safeguard } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

/** TODO
 * - [ ] Add placeholder image/color for course cover image if not present
 * - [ ] Create and use assertions for site settings and current user
 * - [ ] Fetch courses properly for logged in user
 * - [ ] Sort courses using the sort_order column
 */

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv } = env;

  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });

  const courses = await selectCoursesWithStats({ env, userId: currentUser?.id });
  const sortedCourses = sortCoursesForUser(courses);
  return makeHtmlResponse(
    <HomePage siteSettings={siteSettings} currentUser={currentUser} courses={sortedCourses} />
  );
});

function HomePage({ siteSettings, currentUser, courses }) {
  const { site_title, site_description, site_tagline, site_favicon_url, site_logo_url } = siteSettings;
  return (
    <RootLayout
      title={`${site_title} - ${site_tagline}`}
      description={site_description}
      faviconUrl={site_favicon_url}
      styles={["ui", "home"]}
    >
      <MainNav logoUrl={site_logo_url} siteTitle={site_title} currentUser={currentUser} />
      <main class="container">
        <header class="page-header">
          <h1 class="page-heading">Courses - {site_title}</h1>
          <p class="page-subheading">{site_tagline}</p>
        </header>
        <ul class="home-courses">
          {courses.map((course) => (
            <li>
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      </main>
    </RootLayout>
  );
}

async function selectCoursesWithStats({ env }) {
  const output = await env.DB.prepare(`SELECT * FROM courses WHERE privacy = 'PUBLIC';`).all();

  const courses = output.results;

  // TODO - all get enrollment information
  return courses;
}

function sortCoursesForUser(courses) {
  // Sort courses based on the order of IDs
  courses.sort((a, b) => {
    if (a.sort_order == null && b.sort_order == null) return 0;
    if (a.sort_order == null) return 1;
    if (b.sort_order == null) return -1;
    return a.sort_order - b.sort_order;
  });

  // Separate courses based on conditions
  return [
    ...courses.filter((course) => course.enrolled_at && !course.certificate_slug),
    ...courses.filter((course) => course.certificate_slug),
    ...courses.filter((course) => !course.enrolled_at),
  ];
}
