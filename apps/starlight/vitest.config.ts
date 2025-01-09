import { defineConfig } from "vitest/config"
import viteConfig from "./vite.config.ts"

// ignore the type error
// @ts-ignore
export default defineConfig({
  ...viteConfig,
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    watch: true,
  },
})
