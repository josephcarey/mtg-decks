import js from "@eslint/js";
import depend from "eslint-plugin-depend";
import perfectionist from "eslint-plugin-perfectionist";
import security from "eslint-plugin-security";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["coverage/", "data/", "node_modules/", "**/*.db"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  unicorn.configs["flat/recommended"],
  perfectionist.configs["recommended-natural"],
  security.configs.recommended,
  depend.configs["flat/recommended"],
  {
    rules: {
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "security/detect-object-injection": "off",
    },
  },
);
