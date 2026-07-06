import { render, waitFor } from "@testing-library/react"
import { beforeAll, beforeEach, afterEach, describe, test, expect, vi } from "vitest"
import { i18n } from "@lingui/core"
import App from "./App"

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcClient: {
      auth: {
        getCurrentUserSession: { query: vi.fn().mockResolvedValue(null) },
      },
    },
  }
})

beforeAll(() => {
  window.scrollTo = vi.fn()
})

describe("App Translation Tests", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  test("Content should be translated correctly in English", async () => {
    i18n.activate("en")

    const { container } = render(<App />)

    await waitFor(
      () => {
        const welcomeTitle = container.querySelector("h1")
        expect(welcomeTitle).not.toBeNull()
      },
      { timeout: 3000 }
    )

    const welcomeTitle = container.querySelector("h1")
    expect(welcomeTitle).toBeInTheDocument()
    if (welcomeTitle) {
      const text = welcomeTitle.textContent || ""
      expect(text).toMatch(/login|account/i)
    }
  })
})

describe("App Chunk Loading Error Handler", () => {
  let errorHandler: ((event: ErrorEvent) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    errorHandler = null

    // Capture the error handler registered by App
    const originalAddEventListener = window.addEventListener
    vi.spyOn(window, "addEventListener").mockImplementation((type, handler) => {
      if (type === "error" && typeof handler === "function") {
        errorHandler = handler as (event: ErrorEvent) => void
      }
      return originalAddEventListener.call(window, type, handler)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("should trigger fallback UI for chunk loading errors", async () => {
    render(<App />)

    await waitFor(() => {
      expect(errorHandler).not.toBeNull()
    })

    const mockEvent = {
      error: new TypeError("Failed to fetch dynamically imported module: /assets/chunk-abc123.js"),
      filename: "http://localhost:5173/assets/chunk-abc123.js",
      preventDefault: vi.fn(),
    } as unknown as ErrorEvent

    const rootDiv = document.createElement("div")
    rootDiv.id = "root"
    document.body.appendChild(rootDiv)

    errorHandler?.(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(rootDiv.innerHTML).toContain("Connection Lost")
    expect(rootDiv.innerHTML).toContain("development server has stopped responding")

    document.body.removeChild(rootDiv)
  })

  test("should NOT trigger fallback for generic fetch errors", async () => {
    render(<App />)

    await waitFor(() => {
      expect(errorHandler).not.toBeNull()
    })

    const mockEvent = {
      error: new Error("Failed to fetch: network error"),
      filename: "http://localhost:5173/some-api-call",
      preventDefault: vi.fn(),
    } as unknown as ErrorEvent

    const rootDiv = document.createElement("div")
    rootDiv.id = "root"
    rootDiv.innerHTML = "<div>Original Content</div>"
    document.body.appendChild(rootDiv)

    errorHandler?.(mockEvent)

    // Should NOT call preventDefault or replace content (not a TypeError and not an import error)
    expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    expect(rootDiv.innerHTML).toBe("<div>Original Content</div>")

    document.body.removeChild(rootDiv)
  })

  test("should trigger fallback for Vite-specific import errors", async () => {
    render(<App />)

    await waitFor(() => {
      expect(errorHandler).not.toBeNull()
    })

    const mockEvent = {
      error: new TypeError("Importing a module script failed"),
      filename: "/assets/index-xyz789.js",
      preventDefault: vi.fn(),
    } as unknown as ErrorEvent

    const rootDiv = document.createElement("div")
    rootDiv.id = "root"
    document.body.appendChild(rootDiv)

    errorHandler?.(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(rootDiv.innerHTML).toContain("Connection Lost")

    document.body.removeChild(rootDiv)
  })

  test("should NOT trigger for errors without filename", async () => {
    render(<App />)

    await waitFor(() => {
      expect(errorHandler).not.toBeNull()
    })

    const mockEvent = {
      error: new TypeError("Failed to fetch module"),
      filename: undefined,
      preventDefault: vi.fn(),
    } as unknown as ErrorEvent

    const rootDiv = document.createElement("div")
    rootDiv.id = "root"
    rootDiv.innerHTML = "<div>Original Content</div>"
    document.body.appendChild(rootDiv)

    errorHandler?.(mockEvent)

    // Should NOT trigger without filename context
    expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    expect(rootDiv.innerHTML).toBe("<div>Original Content</div>")

    document.body.removeChild(rootDiv)
  })
})
