import { defineConfig } from "vitest/config"
import viteConfig from "./vite.config.ts"

export default defineConfig({
  ...viteConfig,
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    watch: true,
    server: {
      deps: {
        inline: ["@cloudoperators/juno-ui-components"],
      },
    },
  },
})
