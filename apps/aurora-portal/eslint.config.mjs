/** @type {import("eslint").Linter.Config} */
import pluginLingui from "eslint-plugin-lingui"
import config from "@cobaltcore-dev/aurora-config/eslint/index.mjs"

export default [
  ...config,
  pluginLingui.configs["flat/recommended"],
  {
    ignores: ["scripts/*", "extensions/*", "*.js", "*.d.ts"], // Add this line
  },
]
