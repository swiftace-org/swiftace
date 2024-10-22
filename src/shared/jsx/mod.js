import attrsToString from "/shared/jsx/attrsToString.js";
import renderToString from "/shared/jsx/renderToString.js";
import jsxs from "/shared/jsx/jsxs.js";
import Fragment from "/shared/jsx/Fragment.js";
import escapeForHtml from "/shared/jsx/escapeForHtml.js";
import isValidAttr from "/shared/jsx/isValidAttr.js";
import voidTags from "/shared/jsx/voidTags.js";
import _jsx from "/shared/jsx/_jsx.js";

const jsx = {
  jsx: _jsx,
  jsxs,
  Fragment,
  renderToString,
  attrsToString,
  escapeForHtml,
  isValidAttr,
  voidTags,
};

export default jsx;
