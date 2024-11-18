import test from "shared/test/mod.js";
import assert from "shared/assert/@.js";
import render from "shared/jsx/render/@.js";

test.describe(render.isValidAttr.name, () => {
  test.it("accepts valid attribute names", () => {
    const IS_VALID = true;
    assert.equals(render.isValidAttr("data-value"), IS_VALID);
    assert.equals(render.isValidAttr("aria-hidden"), IS_VALID);
    assert.equals(render.isValidAttr("customAttr"), IS_VALID);
  });

  test.it("rejects invalid attribute names", () => {
    const NOT_VALID = false;
    assert.equals(render.isValidAttr('data"val'), NOT_VALID);
    assert.equals(render.isValidAttr("invalid>attr"), NOT_VALID);
    assert.equals(render.isValidAttr("attr with space"), NOT_VALID);
    assert.equals(render.isValidAttr("attr/equals="), NOT_VALID);
  });

  test.it("throws for non-string input", () => {
    const msg = "'attrName' must be a string";
    assert.throws(() => render.isValidAttr(123), Error, msg);
    assert.throws(() => render.isValidAttr(null), Error, msg);
  });
});

test.describe(render.attrsToStr.name, () => {
  test.it("renders empty object", () => {
    const input = {};
    const expected = "";
    assert.equals(render.attrsToStr(input), expected);
  });

  test.it("renders mixed attribute types", () => {
    const input = {
      id: "test",
      disabled: true,
      class: null,
      class2: undefined,
      title: 'He said "Hello"',
    };
    const expected = ' id="test" disabled title="He said &quot;Hello&quot;"';
    assert.equals(render.attrsToStr(input), expected);
  });

  test.it("throws for illegal attribute names", () => {
    const input = { "illegal>attr": "value" };
    const msg = "Illegal attribute name: illegal-attr";
    assert.throws(() => render.attrsToStr(input), msg);
  });

  test.it("throws for non-object input", () => {
    const input = "test";
    const msg = "'attrs' must be an object";
    assert.throws(() => render.attrsToStr(input), msg);
  });
});

test.describe(render.escapeForHtml.name, () => {
  test.it("escapes &, <, >, \", and '", () => {
    const input = 'Tom & Jerry\'s < "quotes" >';
    const escapedOutput = "Tom &amp; Jerry&#39;s &lt; &quot;quotes&quot; &gt;";
    assert.equals(render.escapeForHtml(input), escapedOutput);
  });

  test.it("escapes XSS attack vectors", () => {
    const xssInput = `<script>alert('XSS')</script>`;
    const escapedOutput = `&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;`;
    assert.equals(render.escapeForHtml(xssInput), escapedOutput);
  });

  test.it("throws error for non-string input", () => {
    const message = "`unsafeText` must be a string";
    assert.throws(() => render.escapeForHtml(123), Error, message);
    assert.throws(() => render.escapeForHtml(null), Error, message);
    assert.throws(() => render.escapeForHtml(undefined), Error, message);
    assert.throws(() => render.escapeForHtml({}), Error, message);
  });
});

test.describe(render.jsxToStr.name, () => {
  test.it("renders text element", () => {
    const input = "Hello, world!";
    const expected = "Hello, world!";
    assert.equals(render.jsxToStr(input), expected);
  });
});

test.describe(render.assertJsxObj.name, () => {
  test.it("accepts valid JSX elements", () => {
    const validElement = {
      type: "div",
      props: { className: "container", style: "margin-top:10px;" },
      key: null,
    };
    render.assertJsxObj(validElement);
  });

  test.it("throws for invalid JSX elements", () => {
    const E = assert.AssertionError;

    const missingType = { props: {}, key: null };
    assert.throws(() => render.assertJsxObj(missingType), E);

    const missingProps = { type: "div", key: null };
    assert.throws(() => render.assertJsxObj(missingProps), E);

    const invalidType = { type: 123, props: {}, key: null };
    assert.throws(() => render.assertJsxObj(invalidType), E);

    const invalidProps = { type: "div", props: 123, key: null };
    assert.throws(() => render.assertJsxObj(invalidProps), E);

    const invalidKey = { type: "div", props: {}, key: 123 };
    assert.throws(() => render.assertJsxObj(invalidKey), E);
  });
});

test.describe(render.jsxToStr.name, () => {
  test.it("does not render undefined, null, or false", () => {
    assert.equals(render.jsxToStr(undefined), "");
    assert.equals(render.jsxToStr(null), "");
    // deno-lint-ignore no-boolean-literal-for-arguments
    assert.equals(render.jsxToStr(false), "");
  });

  test.it("renders a text element with proper escaping", () => {
    const input = "Tom & Jerry's < 'quotes' >";
    const expected = "Tom &amp; Jerry&#39;s &lt; &#39;quotes&#39; &gt;";
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders a void HTML tag without attributes", () => {
    const input = { type: "img", props: {} };
    const expected = "<img>";
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders a void HTML tag with attributes", () => {
    const input = {
      type: "img",
      props: {
        src: "https://example.com/image.jpg",
        alt: 'An "image"',
        loading: "lazy",
      },
    };
    const expected =
      '<img src="https://example.com/image.jpg" alt="An &quot;image&quot;" loading="lazy">';
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders an HTML element without attributes", () => {
    const input = {
      type: "div",
      props: {},
    };
    const expected = "<div></div>";
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders an HTML tag without children", () => {
    const input = {
      type: "div",
      props: { class: "container", style: "margin-top:10px;" },
    };
    const expected = '<div class="container" style="margin-top:10px;"></div>';
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders an array of JSX elements", () => {
    const input = [
      "Hello, ",
      null,
      { type: "strong", props: { children: "world" } },
      "!",
    ];
    const expected = "Hello, <strong>world</strong>!";
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders an HTML tag with children", () => {
    const input = {
      type: "div",
      props: {
        class: "container",
        style: "margin-top:10px;",
        children: [
          "Hello <>, ",
          { type: "strong", props: { children: "world" } },
          "!",
        ],
      },
    };
    const expected =
      '<div class="container" style="margin-top:10px;">Hello &lt;&gt;, <strong>world</strong>!</div>';
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders a function component", () => {
    function Greeting({ name }) {
      return <strong>Hello, {name}!</strong>;
    }
    const input = { type: Greeting, props: { name: "JSX" } };
    const expected = "<strong>Hello, JSX!</strong>";
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders fragments using the <> syntax", () => {
    const input = (
      <>
        <h1>
          Hello, <strong>world</strong>!
        </h1>
        <div>
          Goodbye, <strong>world</strong>!
        </div>
      </>
    );
    const input2 = [
      [`<h1>`, "Hello, ", ["<strong>", "world"], `</h1>`],
      [
        `<div>`,
        { class: "container", style: "margin-bottom:10px;" },
        [
          "Goodbye, ",
          [`<strong>`, "world"],
          ["<span>", "Hello, today", "</span>"],
        ],
        `</div>`,
      ],
    ];

    const input3 = ["h1", "Hello, ", ["strong", "world"]];

    const expected =
      "<h1>Hello, <strong>world</strong>!</h1><div>Goodbye, <strong>world</strong>!</div>";
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders a nested tree of JSX elements", () => {
    function Greeting({ name }) {
      return <strong>Hello, {name}!</strong>;
    }
    const input = (
      <div class="container" style="margin-top:10px;" disabled={false}>
        Hello, <strong disabled>world</strong>! <Greeting name="JSX" />
      </div>
    );

    const expected =
      '<div class="container" style="margin-top:10px;">Hello, <strong disabled>world</strong>! <strong>Hello, JSX!</strong></div>';
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("renders unsanitized HTML with dangerouslySetInnerHTML", () => {
    const input = {
      type: "div",
      props: {
        class: "container",
        dangerouslySetInnerHTML: "<script>alert('XSS')</script>",
      },
    };
    const expected =
      "<div class=\"container\"><script>alert('XSS')</script></div>";
    assert.equals(render.jsxToStr(input), expected);
  });

  test.it("throws for invalid JSX elements", () => {
    const E = assert.AssertionError;

    const missingType = { props: {}, key: null };
    assert.throws(() => render.jsxToStr(missingType), E);

    const missingProps = { type: "div", key: null };
    assert.throws(() => render.jsxToStr(missingProps), E);

    const invalidType = { type: 123, props: {}, key: null };
    assert.throws(() => render.jsxToStr(invalidType), E);

    const invalidProps = { type: "div", props: 123, key: null };
    assert.throws(() => render.jsxToStr(invalidProps), E);
  });

  test.it("throws for invalid attribute name", () => {
    const invalidAttr = { type: "div", props: { "invalid>attr": "value" } };
    const msg = "Illegal attribute name: invalid-attr";
    assert.throws(() => render.jsxToStr(invalidAttr), msg);
  });

  test.it("throws if void tag has children", () => {
    const input = {
      type: "img",
      props: { children: "Hello, world!" },
    };
    const msg = "Void tag cannot have children";
    assert.throws(() => render.jsxToStr(input), msg);
  });

  test.it("throws if children are passed with dangerouslySetInnerHTML", () => {
    const input = {
      type: "div",
      props: {
        children: "Hello, world!",
        dangerouslySetInnerHTML: "<script>alert('XSS')</script>",
      },
    };
    const msg = "Cannot use 'dangerouslySetInnerHTML' with 'children'";
    assert.throws(() => render.jsxToStr(input), msg);
  });
});

document.body.append([
  "table",
  ["caption", "Demo Table"],
  [
    "thead",
    [
      "tr",
      ["th_col", "Item"],
      ["th_col", "Quantity"],
      ["th_col", "Price"],
      ["th_col", "Total"],
    ],
  ],
  [
    "tbody",
    [
      "tr",
      ["th_row", "Cecilio Eb Alto Saxophone"],
      ["td", 1],
      ["td", 399.99],
      ["td", 399.99],
    ],
    [
      "tr",
      ["th_row", "Yamaha 5C Alto Sax Mouthpiece"],
      ["td", 1],
      ["td", 39.99],
      ["td", 39.99],
    ],
    [
      "tr",
      ["th_row", "#2 Alto Sax Reeds (5 pack)"],
      ["td", 2],
      ["td", 5.99],
      ["td", 11.98],
    ],
  ],
  ["tfoot", ["tr", ["th_row", { colSpan: 3 }, "Grand Total"], ["td", 451.96]]],
]);
