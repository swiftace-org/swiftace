# SwiftAce

[SwiftAce](https://swiftace.org) is an open-source platform for hosting online
courses. It can be self-hosted, white labeled, customized, and extended using
plugins. SwiftAce is built with Deno, using plain HTML, CSS, and JavaScript.

### Project Structure

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

### Package Structure

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

### Module Structure

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
    utils._validate(input); // Internal reference using object name
  },

  _validate(data) {
    console.log("Internal validation logic");
  },
};

export default utils;
```

### Core Packages

The platform's core functionality is organized into scoped packages:

#### @scope/core

A typical core package might handle:

- Request routing and handling
- Core functionality
- Package integration
- Content rendering

#### @scope/utils

A typical utility package might provide:

- Helper functions
- Shared components
- Data processing
- Common interfaces

## Core Design Principles

1. **No Frontend Frameworks**: Built with raw HTML, CSS, and JavaScript for
   maximum control and performance
2. **No Third-Party Services**: All functionality built in-house or using
   open-source tools
3. **Plain Cloud VMs**: Deployed to traditional cloud VMs for better performance
   and reliability
4. **100% Test Coverage**: Comprehensive testing for stable, bug-free releases
5. **No Build Step**: Direct execution without transpilation or build steps
6. **Extensible by Design**: Plugin system for extending every component

## Development

1. Install Deno (version 1.x or later)
2. Clone the repository
3. Run the development server:
   ```bash
   deno task dev
   ```
