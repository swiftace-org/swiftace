import jsx from "/shared/jsx/mod.js";

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
export default function renderToString(jsxElement) {
  // Text element
  if (typeof jsxElement === "string") return jsx.escapeForHtml(jsxElement);

  // Array or Fragment
  if (Array.isArray(jsxElement)) return jsxElement.map(renderToString).join("");

  const { type, props } = jsxElement;

  // HTML tag
  if (typeof type === "string") {
    const { children, ...attrs } = props;
    const attrsStr = jsx.attrsToString(attrs);
    if (jsx.voidTags.includes(type)) {
      // TODO - Throw error if children are passed (?)
      return `<${type} ${attrsStr}>`;
    } else {
      const childrenStr = renderToString(children);
      return `<${type} ${attrsStr}>${childrenStr}</${type}>`;
    }
  }

  // Function component
  if (typeof type === "function") {
    return renderToString(type(props));
  }
}
