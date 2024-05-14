import { CourseCard } from "lib/ui/course-card";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { makeHtmlResp, safeguard } from "lib/utils";
import { getCurrentUserId } from "lib/utils/auth";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ request, env }) {
  const currentUserId = await getCurrentUserId({ request, env });
  const currentUser = currentUserId && (await env.DB.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1;`).bind(currentUserId).first());

  const courses = await selectCoursesWithStats({ env, userId: currentUser?.id });
  const sortedCourses = sortCoursesForUser(courses);
  return makeHtmlResp(<HomePage env={env} currentUser={currentUser} courses={sortedCourses} />);
});

function HomePage({ env, currentUser, courses }) {
  return (
    <RootLayout title={env.SITE_TITLE} description={env.SITE_DESCRIPTION} faviconSrc={env.FAVICON_URL} styles={["ui", "home"]}>
      <MainNav logoSrc={env.LOGO_URL} siteTitle={env.SITE_TITLE} currentUser={currentUser} />
      <main className="ui-container">
        <header className="home-header">
          <h1 className="ui-page-heading">Courses - {env.SITE_TITLE}</h1>
          <p>{env.SITE_TAGLINE}</p>
        </header>
        <ul className="home-courses">
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

async function selectCoursesWithStats({ env, userId }) {
  const output = await env.DB.prepare(`SELECT * FROM courses WHERE privacy = 'PUBLIC'`).all();
  const courses = output.results;

  console.log({ courses });

  // TODO - all get enrollment information
  return courses;
}

function sortCoursesForUser(courses, orderIDs) {
  // Sort courses based on the order of IDs
  courses.sort((a, b) => {
    const indexA = a.sort_.indexOf(Number(a.id));
    const indexB = orderIDs.indexOf(Number(b.id));

    return indexA - indexB;
  });

  // Separate courses based on conditions
  return [
    ...courses.filter((course) => course.enrolled_at && !course.certificate_slug),
    ...courses.filter((course) => course.certificate_slug),
    ...courses.filter((course) => !course.enrolled_at),
  ];
}
