import render from "shared/jsx/render/mod.js";

/**
 * Renders an JSX element to a string
 *
 * TODO:
 * - [ ] Add assertions (what are they even?)
 * - [ ] Add props as attributes for text nodes
 * - [ ] Add support for empty tags
 * - [ ] What about props to raw tags not passed as strings?
 * - [ ] Add support for `className` and `htmlFor` ?
 * - [ ] Compare implementation with VHTML ?
 * - [ ] Support dangerouslySetInnerHTML ?
 * - [ ] Handle special cases in attribute setting (e.g. boolean)
 *
 * Reference: https://github.com/dodoas/stringjsx/blob/main/src/stringjsx.js
 */
export default function jsxToStr(element) {
  // Text element
  if (typeof element === "string") return render.escapeForHtml(element);

  // Array or Fragment
  if (Array.isArray(element)) return element.map(jsxToStr).join("");

  const { type, props } = element;

  // HTML tag
  if (typeof type === "string") {
    const { children, ...attrs } = props;
    const attrsStr = render.attrsToString(attrs);
    if (render.voidTags.includes(type)) {
      // TODO - Throw error if children are passed (?)
      return `<${type} ${attrsStr}>`;
    } else {
      const childrenStr = jsxToStr(children);
      return `<${type} ${attrsStr}>${childrenStr}</${type}>`;
    }
  }

  // Function component
  if (typeof type === "function") {
    return jsxToStr(type(props));
  }
}
