/**
 * `jshtml` is a lightweight library for writing clean and performant HTML in pure JavaScript.
 * Create HTML elements and custom components naturally using JavaScript arrays and functions,
 * then render them to spec-compliant HTML strings or serializable JSON.
 *
 * @example
 * ```js
 * import jshtml from "@swiftace/jshtml/server.js";
 *
 * // Define your components using regular JavaScript functions
 * function App() {
 *   const title = "My JSHTML App";
 *   const items = ["Apple", "Banana", "Orange"];
 *
 *   // Use nested arrays to create HTML elements
 *   return [
 *     `html`,
 *     [`head`, [`title`, title]],
 *     [
 *       `body`,
 *       { class: "container" }, // Use objects for attributes
 *       [Header, { title }],
 *       [
 *         `main`,
 *         [`h2`, "Favorite Fruits"],
 *         [`ul`, { children: items.map((item) => [`li`, item]) }],
 *       ],
 *       [Footer, [`p`, "Visit our website for more."]],
 *     ],
 *   ];
 * }
 *
 * // Components can accept props
 * function Header({ title }) {
 *   return [`header`, [`h1`, { class: "title" }, title]];
 * }
 *
 * // Components can accept children
 * function Footer({ children }) {
 *   return [`footer`, [`p`, "© 2024 JSHTML"], ...children];
 * }
 *
 * // Render to a spec-compliant HTML string
 * const html = jshtml.renderToHtml([App]);
 * console.log(html);
 * ```
 *
 * @todo
 * - [ ] Include `rawHtml` before children (and remove errors for both present case)
 */
const jshtmlServer = {
  /**
   * Renders a JSHTML element into a valid spec-compliant HTML string
   * Supports raw data types and well as array-based JSHTML elements
   *
   * @param {any} element - The JSHTML element to be rendered as HTML
   * @returns {string} - The HTML string representation of the element
   */
  renderToHtml(element) {
    const elType = typeof element;
    const rawTypes = ["string", "number", "bigint", "boolean", "undefined"];
    jshtmlServer._assert(
      rawTypes.indexOf(elType) !== -1 || Array.isArray(element) ||
        element === null,
      "Invalid 'element'",
    );
    const assertResult = jshtmlServer._makeAssert(
      (result) => typeof result === "string",
      "'result' must be a string",
    );

    // Empty
    if (element === null || element === undefined || element === false) {
      return assertResult("");
    }

    // Text
    if (elType === "string") {
      return assertResult(jshtmlServer._escapeForHtml(element));
    }

    // Other primitive types
    if (elType === "number" || elType === "boolean" || elType === "bigint") {
      return assertResult(element.toString());
    }

    // Array
    const { tag, props, children } = jshtmlServer._parseArray(element);
    // Empty tag
    if (tag === ``) {
      const { rawHtml, ...attrs } = props;
      if (Object.keys(attrs).length > 0) {
        throw Error("Empty tag `` must not have props other than 'rawHtml'");
      }

      // Raw HTML (not escaped)
      if (rawHtml) {
        if (typeof rawHtml !== "string") {
          throw Error("'rawHtml' must be a string");
        }
        if (children.length > 0) {
          throw Error("'rawHtml' and 'children' must not be used together");
        }
        return assertResult(rawHtml);
      }

      // List of elements
      return assertResult(children.map(jshtmlServer.renderToHtml).join(""));

      // HTML tag
    } else if (typeof tag === "string") {
      if (!jshtmlServer._isValidTag(tag)) {
        throw Error(`Invalid tag name: ${tag}`);
      }
      const { rawHtml, ...attrs } = props;
      const attrsStr = jshtmlServer._attrsToStr(attrs);

      // Void Tag
      if (jshtmlServer.VOID_TAGS.indexOf(tag) !== -1) {
        if (children.length > 0) {
          throw Error(`Void tag ${tag} can't have children`);
        }
        if (rawHtml) throw Error(`Void tag ${tag} can't have a 'rawHtml' prop`);
        return assertResult(`<${tag}${attrsStr}>`);
      }

      // Normal tag with raw HTML (not escaped)
      if (rawHtml) {
        if (typeof rawHtml !== "string") {
          throw Error("'rawHtml' must be a string");
        }
        if (children.length > 0) {
          throw Error("'rawHtml' and 'children' must not be used together");
        }
        return assertResult(`<${tag}${attrsStr}>${rawHtml}</${tag}>`);
      }

      // Normal tag with children
      const childrenStr = children.map(jshtmlServer.renderToHtml).join("");
      return assertResult(`<${tag}${attrsStr}>${childrenStr}</${tag}>`);

      // Function component
    } else if (typeof tag === "function") {
      return assertResult(
        jshtmlServer.renderToHtml(tag({ children, ...props })),
      );
    }

    // Invalid element
    throw Error("'element[0]' must be a string or a function");
  },

  /**
   * Renders a JSHTML element into JSON-serializable format
   * Invokes all function components with their props and children
   *
   * @param {any} element - The JSHTML element to be rendered as HTML
   * @returns {any} - A JSON-serializable representation of the element
   */
  renderToJson(element) {
    const elType = typeof element;
    const rawTypes = ["string", "number", "bigint", "boolean", "undefined"];
    jshtmlServer._assert(
      rawTypes.indexOf(elType) !== -1 || Array.isArray(element) ||
        element === null,
      "Invalid 'element'",
    );
    const assertResult = jshtmlServer._makeAssert(
      (r) =>
        rawTypes.indexOf(typeof r) !== -1 || Array.isArray(r) || r === null,
      "Invalid 'result'",
    );

    if (!Array.isArray(element)) return assertResult(element);
    const { tag, props, children } = jshtmlServer._parseArray(element);
    if (typeof tag === "string") {
      const renderedChildren = children.map(jshtmlServer.renderToJson);
      const hasProps = Object.keys(props).length > 0;
      return assertResult(
        hasProps
          ? [tag, props, ...renderedChildren]
          : [tag, ...renderedChildren],
      );
    } else if (typeof tag === "function") {
      return assertResult(
        jshtmlServer.renderToJson(tag({ children, ...props })),
      );
    }
    throw Error("'element[0]' must be a string or a function");
  },

  /**
   * Create a "raw" HTML element that won't be escaped while rendering
   * @param {string} htmlStr  - The raw HTML string
   * @returns {any} - A `jshtml` element for the raw HTML
   */
  rawHtml(htmlStr) {
    return [``, { rawHtml: htmlStr }];
  },

  /**
   * Parses an array representing a JSHTML element into tag, props, and children
   * @param {Array} element - A non-empty array where:
   *   - The first item is the tag (string or function).
   *   - The second item (optional) is an object of properties (`props`).
   *   - Remaining items are children (unless `children` is included `props`).
   * @returns {Object} - an object with keys `tag`, `props`, and `children`
   */
  _parseArray(element) {
    jshtmlServer._assert(
      Array.isArray(element) && element.length > 0,
      "'element' must be a non-empty array",
    );
    const [tag, props] = element;
    jshtmlServer._assert(
      typeof tag === "string" || typeof tag === "function",
      "'element[0]' must be a string or function. Received: " +
        JSON.stringify(tag),
    );
    const assertResult = jshtmlServer._makeAssert(
      (r) => typeof r === "object",
      "result must be an object",
    );

    // No props
    if (!jshtmlServer._isObject(element[1])) {
      return assertResult({ tag, props: {}, children: element.slice(1) });
    }

    // Children within props
    if ("children" in props) {
      if (element.length > 2) {
        throw Error("Include children within or after 'props' but not both");
      }
      const { children, ...rest } = props;
      if (!Array.isArray(children)) {
        throw Error("'children' must be an array of elements");
      }
      return assertResult({ tag, props: rest, children });
    }

    // Children after props
    return assertResult({ tag, props, children: element.slice(2) });
  },

  /**
   * Converts &, <, >, ", ' to escaped HTML codes to prevent XSS attacks
   * @param {string} unsafeStr - The string to be sanitized
   * @returns {string} - The santized string
   */
  _escapeForHtml(unsafeStr) {
    jshtmlServer._assert(
      typeof unsafeStr === "string",
      `'unsafeStr' must be a string`,
    );
    const assertResult = jshtmlServer._makeAssert(
      (res) => typeof res === "string",
      "result must be a string",
    );

    const CODES = { "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "#39" };
    return assertResult(unsafeStr.replace(/[&<>"']/g, (c) => `&${CODES[c]};`));
  },

  /**
   * Converts an object of HTML attributes to a string
   * Handles boolean, null, and undefined values
   * Rejects illegal names and escapes values
   * @param {Object} attrs - HTML attribute key-value pairs
   * @returns {string} - Attributes converted to a string
   */
  _attrsToStr(attrs) {
    jshtmlServer._assert(
      jshtmlServer._isObject(attrs),
      `'attrs' must be an object`,
    );
    const assertResult = jshtmlServer._makeAssert(
      (res) => typeof res === "string",
      "result must be a string",
    );

    const emptyVals = [null, undefined, false];
    const attrsStr = Object.keys(attrs)
      .filter((name) => emptyVals.indexOf(attrs[name]) === -1)
      .map((name) => {
        jshtmlServer._assert(
          jshtmlServer._isValidAttr(name),
          `Illegal attribute name: ${name}`,
        );
        const value = attrs[name];
        if (value === true) return ` ${name}`;
        return ` ${name}="${jshtmlServer._escapeForHtml(value.toString())}"`;
      })
      .join("");
    return assertResult(attrsStr);
  },

  /**
   * Checks if a string is a valid HTML attribute name
   * Based on {@link https://dev.w3.org/html5/spec-LC/syntax.html#syntax-attributes}
   *
   * @param {string} name - The attribute name to validate
   * @returns {boolean} - `true` if `name` is valid, `false` otherwise
   */
  _isValidAttr(name) {
    jshtmlServer._assert(typeof name === "string", "'name' must be a string");
    const assertResult = jshtmlServer._makeAssert(
      (r) => typeof r === "boolean",
      "'result' must be a boolean",
    );

    // deno-lint-ignore no-control-regex
    const nameRegex = /^[^ \x00-\x1F"'<>/=\\\uFDD0-\uFDEF\uFFFE\uFFFF]+$/;
    return assertResult(nameRegex.test(name));
  },

  /**
   * Checks if a string is a valid HTML tag or custom element name
   *
   * The following guidlines are used for validation:
   * - HTML tag name: {@link https://dev.w3.org/html5/spec-LC/syntax.html#elements-0}
   * - Custom element name: {@link https://html.spec.whatwg.org/#valid-custom-element-name}
   *
   * @param {string} name - The tag name to validate
   * @returns {boolean} `true` if `name` is valid, `false` otherwise
   */
  _isValidTag(name) {
    jshtmlServer._assert(
      typeof name === "string",
      "'name' must be a non-empty string",
    );
    const assertResult = jshtmlServer._makeAssert(
      (r) => typeof r === "boolean",
      "'result' must be a boolean",
    );

    if (name.toLowerCase() === "!doctype") return true;

    const normalTagRegex = /^[a-zA-Z][a-zA-Z0-9]*$/;
    const customElementRegex =
      /^[a-z][\-.0-9_a-z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]*-[\-.0-9_a-z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]*$/u;
    return assertResult(
      normalTagRegex.test(name) || customElementRegex.test(name),
    );
  },

  /* Names of void (self-closing) HTML tags e.g. <br> */
  VOID_TAGS: [
    "area",
    "base",
    "br",
    "col",
    "command",
    "embed",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ],

  /**
   * Checks if a value is a non-null non-array object
   * @param {any} val - The value to be checked
   * @returns {boolean} - `true` or `false`
   */
  _isObject(val) {
    return typeof val === "object" && val !== null && !Array.isArray(val);
  },

  /**
   * Evaulates and expression and throws if it is `false`
   *
   * @param {any} expr - The expression to be checked
   * @param {string} [msg] - Message to be included in the error
   * @returns {undefined} - No return value
   * @throws {jshtml.AssertionError} - If `expr` evaluates to false
   */
  _assert(expr, msg = "") {
    if (!expr) throw new jshtmlServer.AssertionError(msg);
  },

  /**
   * Creates a function to asserts a value using a given predicate
   *
   * @param {function} predicate - The predicate to be used for assertion
   * @param {string} msg - The message to be included in the error
   * @returns {function} - A function that accepts a value and asserts `predicate`
   */
  _makeAssert(predicate, msg = "") {
    return function (value) {
      jshtmlServer._assert(predicate(value), msg);
      return value;
    };
  },

  /* Error thrown when an assertion fails */
  AssertionError: class extends Error {},
};

export default jshtmlServer;
