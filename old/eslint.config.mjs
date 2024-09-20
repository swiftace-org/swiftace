import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

export default [
  { files: ["**/*.{js,mjs,cjs,jsx}"] },
  { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  pluginReactConfig,
  {
    rules: {
      "react/prop-types": 0,
      "react/no-unknown-property": [
        "error",
        { ignore: ["class", "enctype", "maxlength", "onsubmit", "for", "onclick", "crossorigin"] },
      ],
      "react/jsx-key": 0,
    },
    settings: {
      react: {
        pragma: "jsx",
        version: "18.3.1",
      },
    },
  },
  {
    files: ["public/js/**/*.js"],
    languageOptions: { globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: false } } },
  },
];
