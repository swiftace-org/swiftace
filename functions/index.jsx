import { CourseCard } from "lib/ui/course-card";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { getCurrentUser } from "lib/utils/auth";
import { getSiteSettings, makeHtmlResponse, safeguard } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });

  const courses = await selectCoursesWithStats({ env, userId: currentUser?.id });
  const sortedCourses = sortCoursesForUser(courses);
  return makeHtmlResponse(
    <RootLayout title={siteSettings.title} description={siteSettings.description} faviconUrl={siteSettings.faviconUrl} styles={["ui", "home"]}>
      <MainNav logoUrl={siteSettings.logoUrl} siteTitle={siteSettings.title} currentUser={currentUser} />
      <main className="ui-container">
        <header className="home-header">
          <h1 className="ui-page-heading">Courses - {siteSettings.title}</h1>
          <p>{siteSettings.tagline}</p>
        </header>
        <ul className="home-courses">
          {sortedCourses.map((course) => (
            <li>
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      </main>
    </RootLayout>
  );
});

async function selectCoursesWithStats({ env, userId }) {
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
