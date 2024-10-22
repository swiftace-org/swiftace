import test from "shared/test/mod.js";
import assert from "shared/assert/mod.js";
import render from "shared/jsx/render/mod.js";

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
