import { Breadcrumb } from "lib/ui/breadcrumb";
import { CourseCard } from "lib/ui/course-card";
import { MainNav } from "lib/ui/main-nav";
import { NotFound } from "lib/ui/not-found";
import { RootLayout } from "lib/ui/root-layout";
import { getCurrentUser } from "lib/utils/auth";
import { getSiteSettings, makeHtmlResponse, safeguard } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { CACHE_KV: cacheKv, DB: database, IS_LOCAL } = env;

  if (!IS_LOCAL) {
    return new Response(null, { status: 404, statusText: "Not Found" });
  }

  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await getCurrentUser({ request, database });

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
      <NotFound />

      <div className="page-section">
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
