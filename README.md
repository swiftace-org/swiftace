# SwiftAce

[SwiftAce](https://swiftace.org) is an open-source platform for hosting online
courses. It can be self-hosted, white labeled, customized, and extended using
plugins. SwiftAce is built with Deno, using plain HTML, CSS, and JavaScript.

## Project Structure

All code lives under the `src` directory, and is organized into scoped packages.
This modular approach enables clear separation of concerns and enables
extensibility through third-party packages.

```
src/
├── @scope1/          
│   ├── package-a/    
│   └── package-b/    
└── @scope2/           
    ├── package-c/    
    └── package-c/
```

### Package Structure

Files within a package are organized according to the following conventions:

- A `server.js` file containing server-side JavaScript code for the package
- A `public` folder whose contents are served as-is at the path
  `/@scope/package-name/public`
  - A `client.js` file containing browser-specific JavaScript code
  - A `shared.js` file containing JavaScript code shared between server & client
  - A `styles.css` file containing CSS rules
  - Images, icons, and other static assets
- A `README.md` file describing the purpose and functinality of the package.

All of the above are optional. Packages can be client-only, server-only, or
mixed.

### Module Structure

JavaScript files (i.e. modules) inside a package must follow these conventions:

- Each JavaScript file must contain a single named object as its default export.

- All functions, variables, classes, etc., must be part of this object and refer
  to each other using the `objectName.key` syntax.

- To indicate that a particular function or variable is not part of the stable
  public API, its name can be prefixed with an underscore (`_`).

This design allows any individual function or variable to be overridden by an
external plugin, enhancing extensibility.

Here's an example:

```javascript
// myModule.js
const myModule = {
  publicFunction() {
    console.log("This is a public function.");
    this._privateFunction(); // Referencing an internal function
  },

  _privateFunction() {
    console.log("This is a private function, not part of the public API.");
  },
};

export default myModule;
```

### Core Packages

SwiftAce's core functionality is organized into scoped packages under
`@swiftace`:

#### @swiftace/main

The main application package that handles:

- HTTP request routing and handling
- Core application functionality
- Integration with other packages
- Server-side rendering

#### @swiftace/jshtml

A lightweight templating package that:

- Provides server-side HTML rendering
- Uses a simple array-based syntax for template definition
- Supports dynamic content and component composition
- Enables clean separation of markup and logic

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
   deno run --allow-net src/@swiftace/main/server.js
   ```
