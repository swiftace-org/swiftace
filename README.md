# SwiftAce

[SwiftAce](https://swiftace.org) is an open-source course hosting platform that can be self-hosted on Cloudflare. It provides basic LMS functionality and can be customized or whitelabeled to match a company’s brand, design system, etc. It can be thought of as a “Discourse/WordPress for Online Courses” or an “Open-Source Teachable Alternative.”

> _NOTE_: This is project is currently under active development and is not suitable for production use.

## Features

See [What Can You Do with SwiftAce](https://swiftace.org/posts/features)

## Deployment

TODO - Coming Soon

## Environment Variables

The following [environment variables and service bindings](https://developers.cloudflare.com/pages/functions/bindings/) are used in the application and must be configured during deployment:

- `SITE_TITLE` _(required)_ - The title of the site, shown in the browser's tab bar, in meta tags, etc. Keep it short e.g. "Learning Academy"

- `SITE_DESCRIPTION` _(required)_ - A description of the site, used generating meta tags for SEO & link previews. Keep it under 140 characters.

- `SITE_TAGLINE` _(required)_ - A tagline for the site, often shown below the title or on pages like "Sign In", "Sign Up" etc. Limit it to 3-5 words e.g. "Practical and beginner-friendly courses"

- `TURNSTILE_SITE_KEY` _(required)_ - Site key required to show the [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) CAPTCHA widget for human verification on sign up, log in, and other pages.

- `TURNSTILE_SECRET_KEY` _(required)_ - Server-side secret key required to verify the human verification token sent from the Cloudflare Turnstile CAPTCHA widget for human verification

- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` _(required)_ - AWS credentials required for sending emails using AWS SES (simple email service). Follow [these instructions](https://chat.openai.com/share/ca2fb881-436f-4cb8-875a-30a82035fc5a) to generate them.

- `AWS_FROM_EMAIL` _(required)_ - Email address verified with AWS SES for sending emails. Follow [these instructions](https://chat.openai.com/share/0de827f0-c85b-43fc-822d-ccd993a343df) to set up a verified sender email address.

- `JWT_SECRET_KEY` _(required)_ - A random string used as the secret key to [sign JSON web tokens](https://chat.openai.com/share/14a3c3f1-934b-45c6-9497-45341a6b7c32) used for authenticating users. While you can use any random string, we recommend generating a UUID by running the `uuidgen` terminal command.

- `FAVICON_URL` _(optional but recommended)_ - Used to set the favicon for the site, shown in the browser's tab bar.

- `LOGO_URL` _(optional but recommended)_ - Used to set a logo for the site, shown in the navigation bar.

- `PRIVACY_POLICY_URL` _(optional but recommended)_ - Provide a link to the privacy policy for the site (show on the "Sign Up" screen)

- `TERMS_OF_SERVICE_URL` _(optional but recommended)_ - Provide a link to the terms of service page for the site (shown on the "Sign Up" screen)
