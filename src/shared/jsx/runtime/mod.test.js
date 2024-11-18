import runtime from "shared/jsx/runtime/mod.js";
import test from "shared/test/mod.js";
import assert from "shared/assert/@.js";

test.describe(runtime.jsx.name, () => {
  test.it("creates a JSX element with an HTML tag", () => {
    const input = runtime.jsx("div", { id: "test" });
    const expected = { type: "div", props: { id: "test" }, key: null };
    assert.equals(input, expected);
  });

  test.it("creates a JSX element with a component function", () => {
    function Component() {
      return null;
    }
    const input = runtime.jsx(Component, { id: "test" });
    const expected = { type: Component, props: { id: "test" }, key: null };
    assert.equals(input, expected);
  });

  test.it("throws if type is not a string or function", () => {
    const msg = "'type' must be a string or function";
    assert.throws(() => runtime.jsx(null, {}), Error, msg);
    assert.throws(() => runtime.jsx(123, {}), Error, msg);
  });

  test.it("throws if props is not an object", () => {
    const msg = "'props' must be an object";
    assert.throws(() => runtime.jsx("div", null), Error, msg);
    assert.throws(() => runtime.jsx("div", "Hello"), Error, msg);
  });

  test.it("throws if key is not a string or null", () => {
    const msg = "'key' must be a string or null";
    assert.throws(() => runtime.jsx("div", {}, 123), Error, msg);
    assert.throws(() => runtime.jsx("div", {}, {}), Error, msg);
  });
});

test.describe(runtime.Fragment.name, () => {
  test.it("returns children from props", () => {
    const children = [1, 2, 3, 4];
    assert.equals(runtime.Fragment({ children }), children);
    assert.equals(runtime.Fragment({ children: null }), null);
  });

  test.it("throws if props is not an object", () => {
    const msg = "'props' must be an object";
    assert.throws(() => runtime.Fragment(null), Error, msg);
    assert.throws(() => runtime.Fragment("Hello"), Error, msg);
  });

  test.it("throws if props does not have children", () => {
    const msg = "'props' must have children";
    assert.throws(() => runtime.Fragment({}), Error, msg);
  });
});
