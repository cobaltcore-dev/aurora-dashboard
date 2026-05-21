import { render, waitFor } from "@testing-library/react"
import { beforeAll, beforeEach, describe, test, expect, vi } from "vitest"
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
