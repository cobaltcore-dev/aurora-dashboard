/** @type {import("eslint").Linter.Config} */

import config from "@cobaltcore-dev/aurora-config/eslint/index.mjs"

export default [
  ...config,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: ["*.js", "*.d.ts", "dist/**"],
  },
]
