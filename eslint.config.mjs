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
      "react/no-unknown-property": ["error", { ignore: ["class", "enctype"] }],
      "react/jsx-key": 0,
    },
    settings: {
      react: {
        pragma: "jsx",
      },
    },
  },
];
