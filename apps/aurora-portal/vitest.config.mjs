import { defineConfig } from "vitest/config"
import viteConfig from "./vite.config.mjs"

const config = viteConfig({ mode: "test" }) // Use the vite config for test environment

export default defineConfig({
  ...config,
  test: {
    globals: true,
    environment: "jsdom",
    watch: true,
    setupFiles: "./vitest.setup.ts",
  },
})
