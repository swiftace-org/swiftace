import jsx from "lib/jsx";
import { assert, undefinedOrNull, isUrlOrPath } from "lib/validation";

/** TODO:
 * - [ ] Trim the title then perform empty check
 */

export function RootLayout({
  title,
  description,
  children,
  metaImage = null,
  faviconUrl = null,
  styles = ["ui"],
}) {
  const tag = "RootLayout";
  assert({
    tag,
    check: typeof title === "string" && title.length > 0,
    error: "'title' must be a non-empty string",
    data: { title },
  });
  assert({
    tag,
    check: typeof description === "string" && description.length > 0,
    error: "'description' must be non-empty string",
    data: { description },
  });
  assert({
    tag,
    check: undefinedOrNull(metaImage) || (typeof metaImage === "string" && isUrlOrPath(metaImage)),
    error: "'metaImage' must be null/undefined or a valid URL",
    data: { metaImage },
  });
  assert({
    tag,
    check: undefinedOrNull(faviconUrl) || (typeof faviconUrl === "string" && isUrlOrPath(faviconUrl)),
    error: "'favicon' must be null/undefined or a valid URL",
    data: { faviconUrl },
  });
  assert({
    tag,
    check: Array.isArray(styles) && styles.every((item) => typeof item === "string"),
    error: "'styles' must be an array of strings",
    data: { styles },
  });

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description} />
        {metaImage && <meta property="og:image" content={metaImage} />}

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />

        <link rel="preload" as="style" href="/css/variables.css" media="screen" />
        <link rel="preload" as="style" href="/css/normalize.css" media="screen" />
        {styles.map((style) => (
          <link rel="preload" as="style" href={`/css/${style}.css`} media="screen" />
        ))}

        {faviconUrl && <link rel="icon" href={faviconUrl} />}
        <title>{title}</title>

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        ></link>
        <link href="/css/variables.css" rel="stylesheet" />
        <link href="/css/normalize.css" rel="stylesheet" />
        {styles.map((style) => (
          <link href={`/css/${style}.css`} rel="stylesheet" />
        ))}

        <script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          crossorigin="anonymous"
          async
          defer
        ></script>
        <script src="/js/index.js" async defer></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
