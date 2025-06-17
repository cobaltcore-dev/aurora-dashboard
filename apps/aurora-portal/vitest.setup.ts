import { beforeAll, expect } from "vitest"
import * as matchers from "@testing-library/jest-dom/matchers"
import { i18n } from "@lingui/core"

import { messages } from "./src/locales/en/messages"
import { messages as deMessages } from "./src/locales/de/messages"

expect.extend(matchers)

beforeAll(() => {
  // Mock global objects if necessary
  global.window = window
  global.document = window.document

  global.ResizeObserver = class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }

  i18n.load({
    en: messages,
    de: deMessages,
  })
  beforeEach(() => {
    // Reset to default language before each test to avoid interference
    i18n.activate("en")
  })
})
