import { beforeAll, beforeEach, vi, expect } from "vitest"
import * as matchers from "@testing-library/jest-dom/matchers"
import { i18n } from "@lingui/core"
import type { ReactNode } from "react"

import { messages } from "./src/locales/en/messages"
import { messages as deMessages } from "./src/locales/de/messages"

expect.extend(matchers)

// Global mock for @tanstack/react-router
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    createRootRouteWithContext: actual.createRootRouteWithContext,
    useParams: vi.fn(() => ({ projectId: "test-project-id" })),
    useNavigate: vi.fn(() => vi.fn()),
    useMatches: vi.fn(() => []),
    useRouteContext: vi.fn(() => ({})),
  }
})

// Global mock for @/client/trpcClient
vi.mock("@/client/trpcClient", () => {
  const mockTrpcReact = {
    useUtils: vi.fn(),
    createClient: vi.fn(() => ({})),
    Provider: ({ children }: { children: ReactNode }) => children,
  }

  const mockTrpcReactClient = {}

  const mockTrpcClient = {
    query: vi.fn(),
    mutate: vi.fn(),
  }

  return {
    trpcReact: mockTrpcReact,
    trpcReactClient: mockTrpcReactClient,
    trpcClient: mockTrpcClient,
  }
})

beforeAll(() => {
  // Mock global objects if necessary
  global.window = window
  global.document = window.document

  // Global mocks that apply to all tests
  // ResizeObserver is needed for testing some JunoUI-Components like Select
  global.ResizeObserver = class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }

  i18n.load({
    en: messages,
    de: deMessages,
  })
})

beforeEach(() => {
  // Reset to default language before each test to avoid interference
  i18n.activate("en")
})
