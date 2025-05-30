import { defineConfig } from "vitest/config"
import viteConfig from "./vite.config.mjs"

export default defineConfig({
  ...viteConfig({ mode: "test" }), // Use the vite config for test environment
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    watch: true,
    root: ".",
  },
})
