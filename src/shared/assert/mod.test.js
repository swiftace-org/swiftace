import assert from "shared/assert/mod.js";
import test from "shared/test/mod.js";

test.describe(assert.is.name, () => {
  test.it("Serializes data with undefined keys", () => {
    const msg = "Test message";
    const BAD_EXPR = false;
    const data = { key: undefined, k2: "hello" };
    assert.throws(
      () => assert.is(BAD_EXPR, msg, data),
      assert.AssertionError,
      `${msg}\n{\n  "key": "__UNDEFINED__",\n  "k2": "hello"\n}\n`,
    );
  });
});
