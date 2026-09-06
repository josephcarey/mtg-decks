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
      // Named imports from node builtins (e.g. node:path) are clear and tree-shakeable.
      "unicorn/import-style": "off",
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
    },
  },
  {
    // These modules legitimately touch the filesystem with caller-supplied paths (CLI args,
    // resolved bulk/DB locations); the security plugin's non-literal-path heuristic is noise here.
    files: ["src/cli.ts", "src/db/**/*.ts", "src/scryfall/**/*.ts"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "security/detect-object-injection": "off",
    },
  },
);
