import jsx from "lib/utils/jsx";

export function Layout({ title, description, children }) {
  return (
    <html lang="en">
      <head>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/css/normalize.css" />
        <link rel="stylesheet" href="/css/markdown.css" />
        <link rel="stylesheet" href="/css/styles.css" />
        <link rel="stylesheet" href="/css/prism.css" />
        <script defer src="/js/prism.js"></script>
        <title>{title}</title>
      </head>
      <body>
        <div className="container">
          <header>
            <a href="/">
              <img src="/img/logo.svg" alt="SwiftAce" height="28" />
            </a>
            <nav className="nav">
              <a className="nav-link" href="/">
                Home
              </a>
              <a
                className="nav-link"
                href="https://github.com/swiftace-org/swiftace"
                target="_blank"
              >
                GitHub
              </a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
