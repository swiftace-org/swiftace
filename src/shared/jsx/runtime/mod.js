/**
 * Minimal JSX runtime for automatic transpilation in Deno
 *
 * @module
 */

import jsx from "shared/jsx/runtime/jsx.js";
import Fragment from "shared/jsx/runtime/Fragment.js";

const runtime = {
  jsx,
  jsxs: jsx,
  Fragment,
};

export default runtime;
