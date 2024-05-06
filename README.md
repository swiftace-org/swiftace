# SwiftAce

SwiftAce is an open-source course hosting platform that can be self-hosted on Cloudflare. It provides basic LMS functionality and can be customized or whitelabeled to match a company’s brand, design system, etc. It can be thought of as a “Discourse/WordPress for Online Courses” or an “Open-Source Teachable Alternative.”

## Features

TODO - Coming Soon

## Deployment

TODO - Coming Soon

## Environment Variables

The following environment variables are used in the application:

- `SITE_TITLE` (required) - The title of the site, shown in the browser's tab bar, in meta tags, etc. Keep it short e.g. "Learning Academy"
- `SITE_DESCRIPTION` (required) - A description of the site, used generating meta tags for SEO & link previews. Keep it under 140 characters.
- `SITE_TAGLINE` (required) - A tagline for the site, often shown below the title or on pages like "Sign In", "Sign Up" etc. Limit it to 3-5 words e.g. "Practical and beginner-friendly courses"
- `FAVICON_URL` (optional but recommended) - Used to set the favicon for the site, shown in the browser's tab bar.
- `LOGO_URL` (optional but recommended) - Used to set a logo for the site, shown in the navigation bar.
- `PRIVACY_POLICY_URL` (optional but recommended) - Provide a link to the privacy policy for the site (show on the "Sign Up" screen)
- `TERMS_OF_SERVICE_URL` (optional but recommended) - Provide a link to the terms of service page for the site (shown on the "Sign Up" screen)
