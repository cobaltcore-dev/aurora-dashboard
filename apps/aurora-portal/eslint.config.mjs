/** @type {import("eslint").Linter.Config} */

import config from "@cobaltcore-dev/aurora-config/eslint/index.mjs"

export default [
  ...config,
  {
    ignores: ["scripts/*", "extensions/*"], // Add this line
  },
]
