import { beforeAll } from "vitest"
import * as matchers from "@testing-library/jest-dom/matchers"

expect.extend(matchers)
beforeAll(() => {
  // Mock global objects if necessary
  global.window = window
  global.document = window.document
})
