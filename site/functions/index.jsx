import { beforePosts, posts } from "lib/content/posts";
import { Layout } from "lib/ui/layout";
import { Markdown } from "lib/ui/markdown";
import { PostItem } from "lib/ui/post-item";
import jsx from "lib/utils/jsx";
import aboutContent from "lib/content/about.md.txt";
import homeContent from "lib/content/home.md.txt";

const title = "SwiftAce";
const description =
  "SwiftAce is an open-source, self-hosted platform for online courses, with video lessons, Jupyter notebooks, assignments, certificates and an AI tutor.";

// Taken from SwiftAce's fictional demo site with `bun test/demo.ts <binary> --screenshots <dir>`
// in the swiftace repo, as <name>-light.webp and <name>-dark.webp.
const hero = {
  name: "home",
  alt: "The home page of a SwiftAce site, with a banner and a grid of courses",
};
const screenshots = [
  {
    name: "course",
    alt: "A course's overview page, with its lessons in a sidebar and the learner's progress",
    caption: "Each course has an overview, with the learner's progress.",
  },
  {
    name: "lesson",
    alt: "A lesson's Jupyter notebook beside a conversation with the AI tutor",
    caption: "Lessons show videos and notebooks, with an AI tutor beside them.",
  },
  {
    name: "participants",
    alt: "A course's participants, with their progress through lessons and assignments",
    caption: "Admins can track every participant's progress.",
  },
  {
    name: "sections",
    alt: "The list of a course's sections, which can be reordered by dragging",
    caption: "Add lessons and assignments, and drag to reorder them.",
  },
  {
    name: "config",
    alt: "The admin page for the site's name, tagline, description and support email",
    caption: "Set your site's name, branding and integrations from an admin page.",
  },
];

function ThemedImage({ name, alt }) {
  return ["dark", "light"].map((theme) => (
    <img
      className={theme}
      src={`/img/screenshots/${name}-${theme}.webp`}
      alt={alt}
      width="1440"
      height="900"
      loading="lazy"
      decoding="async"
    />
  ));
}

const stroke = { fill: "none", stroke: "currentColor", "stroke-width": "1.5" };

function ThemeSwitch() {
  return (
    <div className="theme-switch" role="group" aria-label="Screenshot theme" hidden>
      <button type="button" value="light" aria-pressed="true" aria-label="Light">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" {...stroke} />
          <path
            d="M12 2.5V4.5M12 19.5V21.5M2.5 12H4.5M19.5 12H21.5M5.3 5.3L6.7 6.7M17.3 17.3L18.7 18.7M5.3 18.7L6.7 17.3M17.3 6.7L18.7 5.3"
            stroke-linecap="round"
            {...stroke}
          />
        </svg>
      </button>
      <button type="button" value="dark" aria-pressed="false" aria-label="Dark">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" stroke-linejoin="round" {...stroke} />
        </svg>
      </button>
    </div>
  );
}

function HomePage() {
  return (
    <Layout title={title} description={description}>
      <h1 className="page-heading">{title}</h1>
      {/* Light, until the switch (shown by screenshots.js) picks dark. */}
      <div className="screenshots" data-theme="light">
        <Markdown content={aboutContent} />
        <figure className="screenshot">
          <ThemedImage {...hero} />
        </figure>
        <Markdown content={homeContent} />

        <div className="section-heading">
          <h2 className="page-subheading" id="screenshots">
            Screenshots
          </h2>
          <ThemeSwitch />
        </div>
        {screenshots.map((shot) => (
          <figure className="screenshot">
            <figcaption>{shot.caption}</figcaption>
            <ThemedImage {...shot} />
          </figure>
        ))}
      </div>
      <script defer src="/js/screenshots.js"></script>

      <div>
        <h2 className="page-subheading" id="devlog">
          Development Log
        </h2>
        {posts
          .filter((p) => !p.hidden)
          .map((post) => (
            <PostItem {...post} />
          ))}
      </div>

      <div>
        <h2 className="page-subheading" id="other-writing">
          Other Writing
        </h2>
        <Markdown content="Posts written while working on [Jovian](https://jovian.com)" />
        {beforePosts
          .filter((p) => !p.hidden)
          .map((post) => (
            <PostItem {...post} />
          ))}
      </div>
    </Layout>
  );
}

export async function onRequestGet() {
  // @ts-ignore
  return new Response(<HomePage />, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
      "Cache-Control": "stale-while-revalidate=60",
    },
  });
}
