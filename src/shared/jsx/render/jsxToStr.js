import render from "shared/jsx/render/mod.js";
import assert from "shared/assert/mod.js";

/**
 * Renders an JSX element to a string
 *
 * TODO:
 * - [x] Add assertions (what are they even?)
 * - [x] Add props as attributes for text nodes
 * - [x] Add support for void tags
 * - [x] What about props to raw tags not passed as strings?
 * - [ ] Add support for `className` and `htmlFor` ?
 * - [ ] Compare implementation with VHTML ?
 * - [x] Support dangerouslySetInnerHTML ?
 * - [x] Handle special cases in attribute setting (e.g. boolean)
 *
 * Reference: https://github.com/dodoas/stringjsx/blob/main/src/stringjsx.js
 */
export default function jsxToStr(element) {
  // Empty elements
  if ([null, undefined, false].includes(element)) return "";

  // Text element
  if (typeof element === "string") return render.escapeForHtml(element);

  // Array or Fragment
  if (Array.isArray(element)) return element.map(jsxToStr).join("");

  // Object element
  render.assertJsxObj(element);
  const { type, props } = element;

  // Function component
  if (typeof type === "function") return jsxToStr(type(props));

  // HTML tag
  const { children, dangerouslySetInnerHTML, ...attrs } = props;
  const attrsStr = render.attrsToStr(attrs);

  if (render.voidTags.includes(type)) {
    assert.is(!children, "Void tag cannot have children");
    return `<${type}${attrsStr}>`;
  }

  if (dangerouslySetInnerHTML) {
    assert.is(
      !children,
      "Cannot use 'dangerouslySetInnerHTML' with 'children'",
    );
    assert.is(
      typeof dangerouslySetInnerHTML === "string",
      "'dangerouslySetInnerHTML' must be a string",
    );
    return `<${type}${attrsStr}>${dangerouslySetInnerHTML}</${type}>`;
  }

  const childrenStr = jsxToStr(children);
  return `<${type}${attrsStr}>${childrenStr}</${type}>`;
}
