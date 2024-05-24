# SwiftAce

[SwiftAce](https://swiftace.org) is an open-source course hosting platform that can be self-hosted on Cloudflare. It provides basic LMS functionality and can be customized or whitelabeled to match a company’s brand, design system, etc. It can be thought of as a “Discourse/WordPress for Online Courses” or an “Open-Source Teachable Alternative.”

> _NOTE_: This is project is currently under active development and is not suitable for production use.

## Features

See [What Can You Do with SwiftAce](https://swiftace.org/posts/features)

## Deployment

TODO - Coming Soon

## Environment Variables

The following [environment variables and service bindings](https://developers.cloudflare.com/pages/functions/bindings/) are used in the application and must be configured during deployment:

- `TURNSTILE_SITE_KEY` _(required)_ - Site key required to show the [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) CAPTCHA widget for human verification on sign up, log in, and other pages.

- `TURNSTILE_SECRET_KEY` _(required)_ - Server-side secret key required to verify the human verification token sent from the Cloudflare Turnstile CAPTCHA widget for human verification

- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` _(required)_ - AWS credentials required for sending emails using AWS SES (simple email service). Follow [these instructions](https://chat.openai.com/share/ca2fb881-436f-4cb8-875a-30a82035fc5a) to generate them.

- `AWS_FROM_EMAIL` _(required)_ - Email address verified with AWS SES for sending emails. Follow [these instructions](https://chat.openai.com/share/0de827f0-c85b-43fc-822d-ccd993a343df) to set up a verified sender email address.
