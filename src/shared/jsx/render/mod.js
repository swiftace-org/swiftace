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

const render = {
  isValidAttr,
  attrsToStr,
  escapeForHtml,
  voidTags,
  jsxToStr,
};

export default render;
