# `jshtml` - HTML Templates in Pure JavaScript

`jshtml` is a lightweight library for writing clean and performant HTML
templates in pure JavaScript. Create HTML elements and custom components
naturally using JavaScript arrays and functions, then render them to
spec-compliant HTML strings or serializable JSON. `jshtml` has no dependencies
and can be used to render HTML on a server on within the browser.

The following example shows how to construct and render `jshtml` elements:

```javascript
import jshtml from "./jshtml.js";

// Define your components using regular JavaScript functions
function App() {
  const title = "My JSHTML App";
  const items = ["Apple", "Banana", "Orange"];

  // Use nested arrays to create HTML elements
  return [
    `html`,
    [`head`, [`title`, title]],
    [
      `body`,
      { class: "container" }, // Use objects for attributes
      [Header, { title }],
      [
        `main`,
        [`h2`, "Favorite Fruits"],
        [`ul`, { children: items.map((item) => [`li`, item]) }],
      ],
      [Footer, [`p`, "Visit our website for more."]],
    ],
  ];
}

// Components can accept props
function Header({ title }) {
  return [`header`, [`h1`, { class: "title" }, title]];
}

// Components can accept children
function Footer({ children }) {
  return [`footer`, [`p`, "© 2024 JSHTML"], ...children];
}

// Render to a spec-compliant HTML string
const html = jshtml.renderToHtml([App]);
console.log(html);
```

This will output clean, spec-compliant HTML (without any spaces or indentation):

```html
<html>
  <head>
    <title>My JSHTML App</title>
  </head>
  <body class="container">
    <header>
      <h1 class="title">My JSHTML App</h1>
    </header>
    <main>
      <h2>Favorite Fruits</h2>
      <ul>
        <li>Apple</li>
        <li>Banana</li>
        <li>Orange</li>
      </ul>
    </main>
    <footer>
      <p>© 2024 JSHTML</p>
      <p>Visit our website for more.</p>
    </footer>
  </body>
</html>
```

The element can also be rendered to serializable JSON that can be edited
programmatically or sent over the wire:

```javascript
const json = jshtml.renderToJson([App]);
console.log(json);
```

This produces the following JSON-serializable output:

```json
[
  "html",
  ["head", ["title", "My JSHTML App"]],
  [
    "body",
    { "class": "container" },
    ["header", ["h1", { "class": "title" }, "My JSHTML App"]],
    [
      "main",
      ["h2", "Favorite Fruits"],
      [
        "ul",
        ["li", "Apple"],
        ["li", "Banana"],
        ["li", "Orange"]
      ]
    ],
    [
      "footer",
      ["p", "© 2024 JSHTML"],
      ["p", "Visit our website for more."]
    ]
  ]
]
```

The above object can be serialized to JSON, sent over the wire, and converted to
an HTML string using `renderToHtml`.

## How to Write JSHTML

### HTML Tags

HTML elements are represented as arrays where the first element is a string
representing the tag name:

```javascript
// Basic elements
const element1 = [
  `div`,
  "Hello world",
];

const element2 = [`br`];

const element3 = [
  `p`,
  { class: "text" },
  "Some text",
];

// Nesting elements
const element4 = [
  `div`,
  [`h1`, "Title"],
  [`p`, "Paragraph"],
];
```

### Attributes (Props)

Attributes (also referred to as "props") can be optionally specified as an
object in the second position of the array:

```javascript
const element = [
  `button`,
  {
    type: "submit",
    class: "btn primary",
    disabled: true,
    "data-id": "123",
  },
  "Submit",
];
```

Non-string attribute values are handled as follows while rendering:

- Boolean attributes (like `disabled`) will be included if set to true `true`,
  and omitted if `false`
- Attributes with `null` and `undefined` values are omitted
- Other values are automatically converted to strings and properly escaped

### Children

Children can be provided in two ways:

1. As additional array elements after the tag and props:

```javascript
const element1 = [
  `div`,
  [`h1`, "Title"],
  [`p`, "First paragraph"],
  [`p`, "Second paragraph"],
];

const element2 = [
  `div`,
  { class: "container" },
  [`h1`, "Title"],
  [`p`, "First paragraph"],
  [`p`, "Second paragraph"],
];
```

2. As the `children` prop (must be an array of elements):

```javascript
[`div`, {
  class: "container",
  children: [
    [`h1`, "Title"],
    [`p`, "Paragraph"],
  ],
}];
```

Individual children can be:

- Strings (automatically escaped to prevent XSS attacks)
- Numbers (converted to strings)
- Arrays representing `jshtml` elements
- `null`, `undefined`, or `false` (ignored)

### Components

Components are regular JavaScript functions that accept a single object
containing props and children and return `jshtml` element:

```javascript
function Button({ type = "button", onClick, children }) {
  return [
    `button`,
    {
      type,
      class: "btn",
      onclick: onClick,
    },
    ...children,
  ];
}
```

Once defined, they can be used in place of regular HTML tags:

```javascript
// Usage
const element = [
  Button,
  {
    type: "submit",
    onClick: "handleClick()",
  },
  "Click me",
];
```

The syntax for defining and using components is nearly identical to the JSX
syntax used by libraries like React. Use components to break your HTML page into
modular, reusable pieces.

### Raw HTML

For cases where you need to insert pre-formatted HTML, use the `rawHtml` prop:

```javascript
const element = [
  `div`,
  {
    rawHtml: "<strong>Pre-formatted</strong> HTML",
  },
];
```

Note: Use this carefully as the content is not escaped!

### Empty Tag (Fragment)

For cases where you need to create a list of elements without an outer tag, you
can use the empty tag `\`\``:

```javascript
const element = [
  ``,
  [`p`, "Hello, world"],
  [`p`, "How are you today?"],
];

const html = jshtml.render(element);
// <p>Hello, world</p><p>How are you today?</p>
```

The above element will be rendered as two `p` tags witout a parent.

## Rendering `jshtml` Elements

### To HTML

Convert JSHTML elements to HTML strings:

```javascript
const element = [
  `div`,
  { class: "greeting" },
  "Hello, World!",
];
const html = jshtml.renderToHtml(element);
// <div class="greeting">Hello, World!</div>
```

### To Serializable JSON

Convert JSHTML elements to JSON-safe format (useful for sending over network):

```javascript
const element = [
  `div`,
  { class: "greeting" },
  "Hello, World!",
];
const json = jshtml.renderToJson(element);
// ["div", { "class": "greeting" }, "Hello, World!"]
```

The output of `renderToJson` can be passed to `renderToHtml` to generate the
same HTML output as the original element.

## Comparison with JSX

`jshtml` provides a similar developer experience to JSX but with several
advantages:

- ✅ No build tools or transpilation needed
- ✅ Works with vanilla JavaScript
- ✅ Smaller bundle size
- ✅ Easier to debug (just arrays and objects)
- ✅ Can be serialized to JSON
- ✅ Runtime validation of tags and attributes

The main difference in syntax is using arrays instead of XML-like notation:

```javascript
// JSX
<div className="container">
  <h1>{title}</h1>
  <p>Content</p>
</div>;

// jshtml
[
  `div`,
  { class: "container" },
  [`h1`, title],
  [`p`, "Content"],
];
```

Both approaches support components, props, and children with very similar
patterns, making it easy to transition between them.

**NOTE:** `jshtml` does not support state, hooks, lifecycle methods and other
such features for building dynamic UIs as its primary purpose is to generate
HTML strings.

## Acknowledgement

`jshtml` borrows heavily from the work done by the late
[Jason Knight](https://deathshadow.medium.com/) on a library called
[DOM-JON](https://deathshadow.medium.com/building-a-better-javascript-dom-builder-part-1-4bf7b3639e5b),
a browser-only implementation of a similar syntax for efficient DOM manipulation
in pure JavaScript.
