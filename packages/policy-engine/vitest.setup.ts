import { beforeAll } from "vitest"

beforeAll(() => {
  // Mock global objects if necessary
  global.window = window
  global.document = window.document
})
