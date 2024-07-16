import { Breadcrumb } from "ui/breadcrumb";
import { CourseCard } from "ui/course-card";
import { MainNav } from "ui/main-nav";
import { RootLayout } from "ui/root-layout";
import { getCurrentUser } from "lib/auth";
import { getSiteSettings, makeHtmlResponse, safeguard } from "lib/cloudflare";
import jsx from "lib/jsx";

export const onGetDebug = safeguard(async function ({ request, env }) {
  const { CACHE_KV: cacheKv, DB: database, IS_LOCAL } = env;

  if (!IS_LOCAL) {
    return new Response(null, { status: 404, statusText: "Not Found" });
  }

  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });
  console.error({ currentUser });

  const course = {
    slug: "react-fundamentals",
    cover_url: "https://i.imgur.com/d4FS1Vi.png",
    title: "React Fundamentals",
    overview:
      "Learn the basics of React in this beginner-friendly introductory course. Learn the basics of React in this beginner-friendly introductory course. Learn the basics of React in this beginner-friendly introductory course.",
    total_lessons: 12,
    total_assignments: 5,
    enrolled_at: 1719912613, // Unix timestamp
    certificate_slug: "https://certificate.com",
  };

  const user = {
    avatar_url: "https://i.pravatar.cc/150?img=52",
    first_name: "John",
    last_name: "Doe",
    is_admin: true,
  };

  return makeHtmlResponse(
    <RootLayout title={siteSettings.site_title} description={siteSettings.site_description}>
      <MainNav siteTitle={siteSettings.title} currentUser={user} logoUrl={siteSettings.site_logo_url} />

      <div class="page-section">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Manage", href: "/manage" },
          ]}
        />
      </div>

      <div style="padding: 1rem; width: 32rem; display: flex; flex-direction:row-reverse;">
        <CourseCard course={course} />
      </div>
    </RootLayout>
  );
});
