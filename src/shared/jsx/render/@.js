/**
 * Utilities for rendering JSX elements.
 *
 * @module
 */

import isValidAttr from "shared/jsx/render/isValidAttr.js";
import attrsToStr from "shared/jsx/render/attrsToStr.js";
import escapeForHtml from "shared/jsx/render/escapeForHtml.js";
import voidTags from "shared/jsx/render/voidTags.js";
import jsxToStr from "shared/jsx/render/jsxToStr.js";
import assertJsxObj from "shared/jsx/render/assertJsxObj.js";

const render = {
  jsxToStr,
  assertJsxObj,

  isValidAttr,
  attrsToStr,
  escapeForHtml,

  voidTags,
};

export default render;
