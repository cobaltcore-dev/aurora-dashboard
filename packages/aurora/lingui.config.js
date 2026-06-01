import { defineConfig } from "@lingui/cli"
import { formatter } from "@lingui/format-po"

export default defineConfig({
  sourceLocale: "en",
  locales: ["de", "en"],
  format: formatter({ origins: false }),
  compileNamespace: "ts",

  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
})
