import render from "shared/jsx/render/@.js";
import assert from "shared/assert/@.js";

/**
 * Renders a JSX element to its HTML string representation
 * Supports text, array, HTML tags, and function components
 *
 * TODO:
 * - [ ] Add support for `className` and `htmlFor` ?
 * - [ ] Add support for pretty printing (separate function?)
 * - [ ] Add support for numbers (??)
 *
 * @param {unknown} element - JSX element to render
 * @returns {string} HTML string representation of `element`
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
