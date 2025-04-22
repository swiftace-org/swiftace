# SwiftAce

[SwiftAce](https://swiftace.org) is an open-source platform for hosting online
courses. It can be self-hosted, white labeled, customized, and extended using
plugins. SwiftAce is built with Deno, using plain HTML, CSS, and JavaScript.

## Project Structure

The codebase is organized into scoped packages under the root directory.
Multiple scopes allow logical grouping of related packages. This modular
approach enables clear separation of concerns and extensibility through
third-party packages.

```
@scope1/            
├── package-a/     
└── package-b/     
@scope2/            
├── package-c/     
└── package-d/
```

## Package Structure

Each package must contain a `deno.json` file with:

```json
{
  "name": "@scope/package-name",
  "version": "1.0.0",
  "exports": {
    "./server.js": "./server.js",
    "./public/client.js": "./public/client.js",
    "./public/shared.js": "./public/shared.js"
  }
}
```

Other files within a package follow these conventions:

- `server.js` - Server-side JavaScript code
- `public/` - Static assets served at `/@scope/[package-name]/public/`
  - `client.js` - Browser-specific JavaScript code
  - `shared.js` - Code shared between server & client
  - CSS files, images, icons, and other assets
- `README.md` - Package documentation

All files except `deno.json` are optional. Packages can be client-only,
server-only, or mixed.

## File Structure

JavaScript files (modules) must follow these conventions:

1. Each file exports a single named object as its default export
2. All functions, variables, and classes must be properties of this object
3. Internal references must use `objectName.propertyName` syntax
4. Private/internal members are prefixed with underscore (`_`)

This design allows any function or variable to be overridden by plugins.
Example:

```javascript
// utils.js
const utils = {
  formatData(input) {
    console.log("Processing input...");
    utils._validate(input); // Internal reference using object name (not this)
  },

  _validate(data) {
    console.log("Internal validation logic");
  },
};

export default utils;
```

## Design Principles

SwiftAce is a web application written in JavaScript using the Deno runtime. Here
are some design principles:

1. **No Frontend Frameworks**: I'm using raw HTML, CSS, and JavaScript (no
   React, Next.js, Tailwind, TypeScript etc.) to ensure maximum control, reduce
   complexity, allow customization, and improve performance.

2. **No Third-Party Services**: All functionality (database, user
   authentication, analytics, monitoring, email, background jobs) will be built
   in-house or using open-source tools/libraries to avoid vendor lock-in, reduce
   costs, improve stability, and ensure privacy.

3. **Deployed to Plain Old Cloud VMs**: I've decided to ditch serverless for
   plain old cloud VMs, as it will make the application faster, cheaper, and
   more reliable.

4. **100% Test Coverage**: Unlike SaaS platforms where new features are deployed
   weekly/daily, open-source software has a slower release cycle and users
   expect new versions to be stable and bug-free, so we need extensive testing.

5. **No Build Step**: There is no transpilation, building, or build step. The
   exact same command will run in both development and production. We'll use
   Deno's built-in HTTP server to handle HTTP requests, make database queries,
   and return HTML/JSON.

6. **Extensible by Design**: User-installed plugins should be able to modify or
   extend every single component of SwiftAce, down to individual functions,
   variables, and HTML elements. To achive this, every module will export a
   single named object as its default export, which contains all its contents.

## Development

1. Install [Deno](https://deno.com) (version 2.x or later)

2. Clone the repository

3. Run the development server:
   ```bash
   deno task dev
   ```
