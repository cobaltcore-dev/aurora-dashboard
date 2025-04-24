import { defineConfig } from "vitest/config"
import viteConfig from "./vite.config.mjs"

export default defineConfig({
  ...viteConfig,
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    watch: true,
    root: "."
  },
})
