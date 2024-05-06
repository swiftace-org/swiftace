import { DEFAULT_FAVICON } from "lib/utils/constants";
import jsx from "lib/utils/jsx";

export function RootLayout({ title, description, children, metaImage = null, faviconSrc = DEFAULT_FAVICON, styles = ["ui"] }) {
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

        <link rel="icon" href={faviconSrc} />
        <title>{title}</title>

        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet"></link>
        {/* add link tags for each entry in styles */}
        <link href="/css/variables.css" rel="stylesheet" />
        <link href="/css/normalize.css" rel="stylesheet" />
        {styles.map((style) => (
          <link href={`/css/${style}.css`} rel="stylesheet" />
        ))}

        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" crossOrigin="anonymous" async defer></script>
        <script src="/js/index.js" async defer></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
