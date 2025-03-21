import { defineConfig } from "vitest/config"
import viteConfig from "./vite.config.mjs"

// ignore the type error
export default defineConfig({
  ...viteConfig,
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    watch: true,
  },
})
