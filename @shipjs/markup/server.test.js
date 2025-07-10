import markup from "./server.js";
import { assertEquals, assertThrows } from "@std/assert";

const { renderToHtml } = markup;

Deno.test(`${renderToHtml.name} - renders empty elements`, () => {
  assertEquals(renderToHtml(null), "");
  assertEquals(renderToHtml(false), "");
  assertEquals(renderToHtml(undefined), "");
  assertEquals(renderToHtml(""), "");
});

Deno.test(`${renderToHtml.name} - renders strings with proper escaping`, () => {
  const input = "Tom & Jerry's < 'quotes' >";
  const expected = "Tom &amp; Jerry&#39;s &lt; &#39;quotes&#39; &gt;";
  assertEquals(renderToHtml(input), expected);
});

Deno.test(`${renderToHtml.name} - renders other primitive types as strings`, () => {
  assertEquals(renderToHtml(23), "23");
  assertEquals(renderToHtml(true), "true");
  assertEquals(renderToHtml(123n), "123");
});

Deno.test(`${renderToHtml.name} - renders a void HTML tag without attributes`, () => {
  const input = ["img"];
  const expected = "<img>";
  assertEquals(renderToHtml(input), expected);
});

Deno.test(`${renderToHtml.name} - renders a void HTML tag with attributes`, () => {
  const input = [`img`, {
    src: "https://example.com/image.jpg",
    alt: 'An "image"',
    loading: "lazy",
  }];
  const expected =
    '<img src="https://example.com/image.jpg" alt="An &quot;image&quot;" loading="lazy">';
  assertEquals(renderToHtml(input), expected);
});

Deno.test(`${renderToHtml.name} - renders an HTML element without children or attributes`, () => {
  const input = [`div`];
  const expected = "<div></div>";
  assertEquals(renderToHtml(input), expected);
});

Deno.test(`${renderToHtml.name} - renders an HTML tag with attributes only`, () => {
  const input = [`div`, { class: "container", style: "margin-top:10px;" }];
  const expected = '<div class="container" style="margin-top:10px;"></div>';
  assertEquals(renderToHtml(input), expected);
});

Deno.test(`${renderToHtml.name} - renders an HTML tag with children only`, () => {
  const input = [`div`, "Hello, ", null, [`strong`, "world"], "!"];
  const expected = "<div>Hello, <strong>world</strong>!</div>";
  assertEquals(renderToHtml(input), expected);
});

Deno.test(`${renderToHtml.name} - renders an HTML tag with attributes and children`, () => {
  const input = [
    `div`,
    { class: "container", style: "margin-top:10px;" },
    "Hello <>, ",
    null,
    [`strong`, "world"],
    "!",
  ];
  const expected =
    '<div class="container" style="margin-top:10px;">Hello &lt;&gt;, <strong>world</strong>!</div>';
  assertEquals(renderToHtml(input), expected);
});

Deno.test(`${renderToHtml.name} - renders a function component`, () => {
  function Greeting({ name, children }) {
    return [`div`, [`strong`, "Hello, ", name, "!"], ...children];
  }
  const input = [Greeting, { name: "JSX" }, [`span`, "Hello, world"]];
  const expected =
    "<div><strong>Hello, JSX!</strong><span>Hello, world</span></div>";
  assertEquals(renderToHtml(input), expected);
});

Deno.test(`${renderToHtml.name} - renders a list of elements starting with \`\``, () => {
  const input = [
    ``,
    [`h1`, "Hello, ", [`strong`, "world"], "!"],
    [`div`, { class: "main" }, "Goodbye, ", [`strong`, "world"], "!"],
  ];
  const expected =
    '<h1>Hello, <strong>world</strong>!</h1><div class="main">Goodbye, <strong>world</strong>!</div>';
  assertEquals(renderToHtml(input), expected);
});

Deno.test(`${renderToHtml.name} - renders unsanitized HTML with 'rawHtml' prop`, () => {
  // Normal tag
  const input = [`div`, {
    class: "container",
    rawHtml: "<script>alert('XSS')</script>",
  }];
  const expected =
    "<div class=\"container\"><script>alert('XSS')</script></div>";
  assertEquals(renderToHtml(input), expected);

  // Empty tag
  const input2 = [``, { rawHtml: "<script>alert('XSS')</script>" }];
  const expected2 = "<script>alert('XSS')</script>";
  assertEquals(renderToHtml(input2), expected2);
});

Deno.test(`${renderToHtml.name} - throws for invalid element types`, () => {
  assertThrows(() => renderToHtml({}), Error, "Invalid 'element'");
  assertThrows(
    () => renderToHtml(Symbol("invalid")),
    Error,
    "Invalid 'element'",
  );
  assertThrows(() => renderToHtml(() => {}), Error, "Invalid 'element'");
});

Deno.test(`${renderToHtml.name} - throws for invalid tag names`, () => {
  assertThrows(
    () => renderToHtml([`invalid_tag_name!`]),
    Error,
    "Invalid tag name: invalid_tag_name!",
  );
});

Deno.test(`${renderToHtml.name} - throws when void tag has children`, () => {
  assertThrows(
    () => renderToHtml([`img`, {}, "Some content"]),
    Error,
    "Void tag img can't have children",
  );
});

Deno.test(`${renderToHtml.name} - throws when void tag has a 'rawHtml' prop`, () => {
  assertThrows(
    () => renderToHtml([`img`, { rawHtml: "<script>alert('XSS')</script>" }]),
    Error,
    "Void tag img can't have a 'rawHtml' prop",
  );
});

Deno.test(`${renderToHtml.name} - throws when 'rawHtml' and 'children' are used together`, () => {
  // Normal tag
  assertThrows(
    () =>
      renderToHtml([`div`, { rawHtml: "<span>raw</span>" }, "This is text"]),
    Error,
    "'rawHtml' and 'children' must not be used together",
  );
  // Empty tag
  assertThrows(
    () => renderToHtml([``, { rawHtml: "<span>raw</span>" }, "This is text"]),
    Error,
    "'rawHtml' and 'children' must not be used together",
  );
});

Deno.test(`${renderToHtml.name} - throws if 'rawHtml' is not a string`, () => {
  assertThrows(
    () => renderToHtml([`div`, { rawHtml: 23 }]),
    Error,
    "'rawHtml' must be a string",
  );
  assertThrows(
    () => renderToHtml([``, { rawHtml: 23 }]),
    Error,
    "'rawHtml' must be a string",
  );
});

Deno.test(`${renderToHtml.name} - throws for invalid props for empty tag`, () => {
  assertThrows(
    () => renderToHtml([``, { class: "container" }]),
    Error,
    "Empty tag `` must not have props other than 'rawHtml'",
  );
});

Deno.test(`${renderToHtml.name} - throws for invalid tag in array`, () => {
  const input = [{}, {}, "Invalid tag"];
  assertThrows(
    () => renderToHtml(input),
    Error,
    "'element[0]' must be a string or function. Received: {}",
  );
});

Deno.test(`${renderToHtml.name} - throws if children are included twice for a function component`, () => {
  function Greeting({ name, children }) {
    return [`div`, [`strong`, "Hello, ", name, "!"], ...children];
  }
  const input = [Greeting, { name: "JSX", children: "Hello, world" }, [
    `span`,
    "Hello, world",
  ]];
  assertThrows(
    () => renderToHtml(input),
    Error,
    "Include children within or after 'props' but not both",
  );
});

const { renderToJson } = markup;

Deno.test(`${renderToJson.name} - returns element as-is if not an array`, () => {
  assertEquals(renderToJson("text"), "text");
  assertEquals(renderToJson(123), 123);
  assertEquals(renderToJson(true), true);
  assertEquals(renderToJson(null), null);
});

Deno.test(`${renderToJson.name} - converts a Markup element to JSON`, () => {
  const input = [`div`, { class: "container" }, "Hello", [`span`, {}, "World"]];
  const expected = [`div`, { class: "container" }, "Hello", ["span", "World"]];
  assertEquals(renderToJson(input), expected);
});

Deno.test(`${renderToJson.name} - renders a function component to JSON`, () => {
  function Greeting({ name, children = [] }) {
    return [`div`, { class: "greeting" }, `Hello, ${name}!`, ...children];
  }
  const input = [Greeting, { name: "JSX" }, [`span`, "Goodbye, world"]];
  const expected = ["div", { class: "greeting" }, "Hello, JSX!", [
    "span",
    "Goodbye, world",
  ]];
  assertEquals(renderToJson(input), expected);
});

Deno.test(`${renderToJson.name} - returns an array with empty tag \`\` as-is`, () => {
  const input = [``, "Hello", "world"];
  const expected = [``, "Hello", "world"];
  assertEquals(renderToJson(input), expected);
});

Deno.test(`${renderToJson.name} - throws for invalid element types`, () => {
  assertThrows(() => renderToJson({}), Error, "Invalid 'element'");
  assertThrows(
    () => renderToJson(Symbol("invalid")),
    Error,
    "Invalid 'element'",
  );
  assertThrows(() => renderToJson(() => {}), Error, "Invalid 'element'");
});

Deno.test(`${renderToJson.name} - throws for invalid tag in array`, () => {
  const input = [{}, {}, "Invalid tag"];
  assertThrows(
    () => renderToJson(input),
    Error,
    "'element[0]' must be a string or function. Received: {}",
  );
});

Deno.test(`${renderToJson.name} - throws if children are included twice for a function component`, () => {
  function Greeting({ name, children }) {
    return [`div`, [`strong`, "Hello, ", name, "!"], ...children];
  }
  const input = [Greeting, { name: "JSX", children: "Hello, world" }, [
    `span`,
    "Hello, world",
  ]];
  assertThrows(
    () => renderToJson(input),
    Error,
    "Include children within or after 'props' but not both",
  );
});

const { _parseArray } = markup;

Deno.test(`${_parseArray.name} - throws if 'element' is not a non-empty array`, () => {
  const msg = "'element' must be a non-empty array";
  assertThrows(() => _parseArray("Hello"), Error, msg); // String
  assertThrows(() => _parseArray(23), Error, msg); // Number
  assertThrows(() => _parseArray(null), Error, msg); // Null
  assertThrows(() => _parseArray([]), Error, msg); // Empty array
});

Deno.test(`${_parseArray.name} - parses separate props and children correctly`, () => {
  const input = [`div`, { class: "container" }, "Hello, ", "world"];
  const expected = {
    tag: `div`,
    props: { class: "container" },
    children: ["Hello, ", "world"],
  };
  assertEquals(_parseArray(input), expected);
});

Deno.test(`${_parseArray.name} - parses children within props correctly`, () => {
  const input = [`div`, { class: "container", children: ["Hello, ", "world"] }];
  const expected = {
    tag: `div`,
    props: { class: "container" },
    children: ["Hello, ", "world"],
  };
  assertEquals(_parseArray(input), expected);
});

Deno.test(`${_parseArray.name} - throws if children are included twice`, () => {
  const input = [
    `div`,
    { class: "container", children: ["Hello, ", "world"] },
    "Hola",
  ];
  assertThrows(
    () => _parseArray(input),
    Error,
    "Include children within or after 'props' but not both",
  );
});

Deno.test(`${_parseArray.name} - throws if children is not an array`, () => {
  const input = [`div`, {
    class: "container",
    children: "'children' must be an array of elements",
  }];
  assertThrows(
    () => _parseArray(input),
    Error,
    "'children' must be an array of elements",
  );
});

const { _escapeForHtml } = markup;

Deno.test(`${_escapeForHtml.name} - escapes &, <, >, \", and '`, () => {
  const input = 'Tom & Jerry\'s < "quotes" >';
  const escapedOutput = "Tom &amp; Jerry&#39;s &lt; &quot;quotes&quot; &gt;";
  assertEquals(_escapeForHtml(input), escapedOutput);
});

Deno.test(`${_escapeForHtml.name} - escapes XSS attack vectors`, () => {
  const xssInput = `<script>alert('XSS')</script>`;
  const escapedOutput = `&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;`;
  assertEquals(_escapeForHtml(xssInput), escapedOutput);
});

Deno.test(`${_escapeForHtml.name} - throws for non-string input`, () => {
  const message = "'unsafeStr' must be a string";
  assertThrows(() => _escapeForHtml(123), Error, message);
  assertThrows(() => _escapeForHtml(null), Error, message);
  assertThrows(() => _escapeForHtml(undefined), Error, message);
  assertThrows(() => _escapeForHtml({}), Error, message);
});

const { _attrsToStr } = markup;

Deno.test(`${_attrsToStr.name} - renders empty object`, () => {
  assertEquals(_attrsToStr({}), "");
});

Deno.test(`${_attrsToStr.name} - renders a mix of different value types`, () => {
  const input = {
    class: "btn primary",
    disabled: true,
    id: "submit-btn",
    onClick: 'alert("clicked")',
    dataRole: null,
    style: undefined,
    draggable: false,
    height: 34,
  };
  const expected =
    ` class="btn primary" disabled id="submit-btn" onClick="alert(&quot;clicked&quot;)" height="34"`;
  const result = _attrsToStr(input);
  assertEquals(result, expected);
});

Deno.test(`${_attrsToStr.name} - throws for non-object inputs`, () => {
  const input = "test";
  const msg = "'attrs' must be an object";
  assertThrows(() => _attrsToStr(input), Error, msg);
});

Deno.test(`${_attrsToStr.name} - throws for illegal attribute names`, () => {
  const input = { "illegal>attr": "value" };
  const msg = "Illegal attribute name: illegal>attr";
  assertThrows(() => _attrsToStr(input), Error, msg);
});

const { _isValidAttr } = markup;

Deno.test(`${_isValidAttr.name} - returns false for the empty string`, () => {
  assertEquals(_isValidAttr(""), false);
});

Deno.test(`${_isValidAttr.name} - returns true for a valid attribute name`, () => {
  assertEquals(_isValidAttr("data-id"), true);
  assertEquals(_isValidAttr("class"), true);
  assertEquals(_isValidAttr("aria-label"), true);
});

Deno.test(`${_isValidAttr.name} - returns false for invalid characters`, () => {
  assertEquals(_isValidAttr("data id"), false); // space
  assertEquals(_isValidAttr("data<id"), false); // `<`
  assertEquals(_isValidAttr('data"id'), false); // `"`
  assertEquals(_isValidAttr("data'id"), false); // `'`
  assertEquals(_isValidAttr("data=id"), false); // `=`
  assertEquals(_isValidAttr("data/id"), false); // `/`
  assertEquals(_isValidAttr("data\\id"), false); // `\`
});

Deno.test(`${_isValidAttr.name} - returns false for control characters`, () => {
  assertEquals(_isValidAttr("data\u0000id"), false); // Null character
  assertEquals(_isValidAttr("data\u001Fid"), false); // Unit Separator
});

Deno.test(`${_isValidAttr.name} - returns false for noncharacters`, () => {
  assertEquals(_isValidAttr("data\uFDD0id"), false); // Noncharacter U+FDD0
  assertEquals(_isValidAttr("data\uFFFEid"), false); // Noncharacter U+FFFE
  assertEquals(_isValidAttr("data\uFFFFid"), false); // Noncharacter U+FFFF
});

Deno.test(`${_isValidAttr.name} - throws for non-string input`, () => {
  assertThrows(() => _isValidAttr(123), Error, "'name' must be a string");
  assertThrows(() => _isValidAttr({}), Error, "'name' must be a string");
  assertThrows(() => _isValidAttr(null), Error, "'name' must be a string");
  assertThrows(() => _isValidAttr(undefined), Error, "'name' must be a string");
});

const { _isValidTag } = markup;

Deno.test(`${_isValidTag.name} - returns false for invalid tag names`, () => {
  assertEquals(_isValidTag(""), false);
  assertEquals(_isValidTag("123"), false); // Starts with a number
  assertEquals(_isValidTag("-tag"), false); // Starts with a hyphen
  assertEquals(_isValidTag("ta@ag"), false); // Contains invalid character
});

Deno.test(`${_isValidTag.name} - returns true for valid HTML tag names`, () => {
  assertEquals(_isValidTag("div"), true);
  assertEquals(_isValidTag("p"), true);
  assertEquals(_isValidTag("span"), true);
  assertEquals(_isValidTag("h1"), true);
});

Deno.test(`${_isValidTag.name} - returns false for invalid custom element names`, () => {
  assertEquals(_isValidTag("-custom-element"), false); // Starts with hyphen
  assertEquals(_isValidTag("custom..element"), false); // Double periods
});

Deno.test(`${_isValidTag.name} - returns true for valid custom element names`, () => {
  assertEquals(_isValidTag("custom-element"), true);
  assertEquals(_isValidTag("my-widget"), true);
  assertEquals(_isValidTag("app-container"), true);
  assertEquals(_isValidTag("x-tag"), true);
  assertEquals(_isValidTag("my-custom-element"), true); // multiple hyphens
  assertEquals(_isValidTag("custom-element-"), true); // ends with hyphen
  assertEquals(_isValidTag("widget-🌟"), false); // Emoji
});

Deno.test(`${_isValidTag.name} - supports Unicode characters for custom elements`, () => {
  assertEquals(_isValidTag("x-élement"), true);
  assertEquals(_isValidTag("tag-アニメ"), true);
});

Deno.test(`${_isValidTag.name} - throws an error when 'name' is not a string`, () => {
  assertThrows(
    () => _isValidTag(123),
    Error,
    "'name' must be a non-empty string",
  );
  assertThrows(
    () => _isValidTag(null),
    Error,
    "'name' must be a non-empty string",
  );
  assertThrows(
    () => _isValidTag(undefined),
    Error,
    "'name' must be a non-empty string",
  );
});
