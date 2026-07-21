import { describe, test, expect, beforeAll, vi } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { FC, ReactNode } from "react"
import { MainNavigation } from "./MainNavigation"
import { AuthProvider } from "../../store/AuthProvider"
import type { SlotProps } from "../../AuroraApp"

import {
  createRootRoute,
  createRoute,
  RouterProvider,
  createRouter,
  Outlet,
  createMemoryHistory,
} from "@tanstack/react-router"

// Mock trpcClient
vi.mock("../../trpcClient", () => ({
  trpcClient: {
    auth: {
      getCurrentUserSession: { query: vi.fn().mockResolvedValue(null) },
      createUserSession: { mutate: vi.fn().mockResolvedValue({ user: null, expires_at: null }) },
      terminateUserSession: { mutate: vi.fn().mockResolvedValue(undefined) },
    },
  },
}))

beforeAll(() => {
  if (!i18n.locale) {
    i18n.activate("en")
  }
})

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </AuthProvider>
)

describe("MainNavigation", () => {
  const createTestRouter = (Component: React.JSX.Element) => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    })

    const rootRoute = createRootRoute({
      component: () => (
        <TestingProvider>
          <div>
            {Component}
            <Outlet />
          </div>
        </TestingProvider>
      ),
    })

    const homeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => <div>Home Page</div>,
    })

    const aboutRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/about",
      component: () => <div>About Page Content</div>,
    })

    const projectsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/projects",
      component: () => <div>Projects Page</div>,
    })

    const routeTree = rootRoute.addChildren([homeRoute, aboutRoute, projectsRoute])

    return createRouter({
      routeTree,
      history: memoryHistory,
      defaultPreload: "intent",
    })
  }

  const mainNavItems = [
    { route: "/", label: "Home" },
    { route: "/about", label: "About" },
  ]

  test("renders logo and navigation items in English", async () => {
    await act(async () => {
      i18n.activate("en")
    })

    const router = createTestRouter(<MainNavigation items={mainNavItems} />)

    await waitFor(() => render(<RouterProvider router={router} />))

    // Check if logo is rendered
    expect(screen.getByText("Aurora")).toBeDefined()

    // Check if navigation items are rendered
    expect(screen.getByText("About")).toBeDefined()
  })

  test("navigation items have correct links", async () => {
    await act(async () => {
      i18n.activate("en")
    })

    const router = createTestRouter(<MainNavigation items={mainNavItems} />)

    await waitFor(() => render(<RouterProvider router={router} />))

    await waitFor(async () => {
      const aboutLink = screen.getByText("About")
      await fireEvent.click(aboutLink)

      // Now we should expect to see the content of the About page
      expect(await screen.queryByText("About Page Content")).toBeInTheDocument()
    })
  })

  test("renders custom navigation items when provided", async () => {
    await act(async () => {
      i18n.activate("en")
    })

    const customItems = [
      { route: "/dashboard", label: "Dashboard" },
      { route: "/settings", label: "Settings" },
    ]

    const router = createTestRouter(<MainNavigation items={customItems} />)

    await waitFor(() => render(<RouterProvider router={router} />))

    // Check if custom navigation items are rendered
    expect(screen.getByText("Dashboard")).toBeDefined()
    expect(screen.getByText("Settings")).toBeDefined()

    // Check that default items are not rendered
    expect(screen.queryByText("About")).toBeNull()
  })

  test("renders custom appName instead of default Aurora", async () => {
    await act(async () => {
      i18n.activate("en")
    })

    const router = createTestRouter(<MainNavigation items={mainNavItems} appName="My Cloud" />)

    await waitFor(() => render(<RouterProvider router={router} />))

    await waitFor(() => {
      expect(screen.getByText("My Cloud")).toBeDefined()
      expect(screen.queryByText("Aurora")).toBeNull()
    })
  })

  test("renders custom logo slot instead of default logo", async () => {
    await act(async () => {
      i18n.activate("en")
    })

    const CustomLogo = (() => <img data-testid="custom-logo" src="/custom-logo.svg" alt="Custom" />) as FC<SlotProps>

    vi.spyOn(await import("@tanstack/react-router"), "useRouteContext").mockReturnValue({ trpcClient: {} })

    const router = createTestRouter(<MainNavigation items={mainNavItems} slots={{ logo: CustomLogo }} />)

    await waitFor(() => render(<RouterProvider router={router} />))

    await waitFor(() => {
      expect(screen.getByTestId("custom-logo")).toBeDefined()
    })

    vi.restoreAllMocks()
  })
})
