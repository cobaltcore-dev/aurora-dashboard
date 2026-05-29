import js from "@eslint/js"

export default [
  js.configs.recommended,
  { ignores: ["dist/**", "node_modules/**", "playwright-report/**", "e2e/playwright-results/**"] },
]
