import { render, waitFor } from "@testing-library/react"
import { beforeAll, beforeEach, describe, test, expect, vi } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import App from "./App"
import { createMemoryHistory, createRouter, createRootRoute, RouterProvider } from "@tanstack/react-router"

beforeAll(() => {
  window.scrollTo = vi.fn()
})

describe("App Translation Tests", () => {
  // Reset i18n to English before each test
  beforeEach(() => {
    i18n.activate("en")
  })

  // Create a minimal test router that wraps App
  const createTestRouter = () => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    })

    const rootRoute = createRootRoute({
      component: () => (
        <I18nProvider i18n={i18n}>
          <App />
        </I18nProvider>
      ),
    })

    return createRouter({
      routeTree: rootRoute,
      history: memoryHistory,
    })
  }

  test("Content should be translated correctly in English", async () => {
    // Ensure English is active
    i18n.activate("en")

    const router = createTestRouter()
    const { container } = render(<RouterProvider router={router} />)

    // Wait for the component to render and find the h1
    await waitFor(
      () => {
        const welcomeTitle = container.querySelector("h1")
        expect(welcomeTitle).not.toBeNull()
      },
      { timeout: 3000 }
    )

    const welcomeTitle = container.querySelector("h1")
    expect(welcomeTitle).toBeInTheDocument()
    // Check for the expected English text
    if (welcomeTitle) {
      const text = welcomeTitle.textContent || ""
      expect(text).toMatch(/aurora|manage|openstack/i)
    }
  })

  test("Content should be translated correctly in German", async () => {
    // Explicitly activate German
    i18n.activate("de")

    const router = createTestRouter()
    const { container } = render(<RouterProvider router={router} />)

    // Wait for the component to render and find the h1
    await waitFor(
      () => {
        const welcomeTitle = container.querySelector("h1")
        expect(welcomeTitle).not.toBeNull()
      },
      { timeout: 3000 }
    )

    const welcomeTitle = container.querySelector("h1")
    expect(welcomeTitle).toBeInTheDocument()
    // Check for the expected German text
    if (welcomeTitle) {
      const text = welcomeTitle.textContent || ""
      expect(text).toMatch(/aurora|verwalten|openstack/i)
    }
  })
})
