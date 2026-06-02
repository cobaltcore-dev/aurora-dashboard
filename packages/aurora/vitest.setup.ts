import { beforeAll, beforeEach, vi, expect } from "vitest"
import * as matchers from "@testing-library/jest-dom/matchers"
import { i18n } from "@lingui/core"
import type { ReactNode } from "react"

// Mock all SVG ?react imports — jsdom cannot parse SVG as React components
vi.mock("./src/client/assets/logo.svg?react", () => ({ default: () => null }))

import { messages } from "./src/locales/en/messages"
import { messages as deMessages } from "./src/locales/de/messages"

expect.extend(matchers)

// Stable router mock — shared instance so assertions on .invalidate/.navigate work
const mockRouter = {
  invalidate: vi.fn(),
  navigate: vi.fn(),
  history: { back: vi.fn() },
}

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
    useRouter: vi.fn(() => mockRouter),
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
})

beforeEach(() => {
  i18n.activate("en")
})
