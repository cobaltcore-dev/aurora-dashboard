import { describe, test, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { MainNavigation } from "./MainNavigation"
import {
  createRootRoute,
  createRoute,
  RouterProvider,
  createRouter,
  Outlet,
  createMemoryHistory,
} from "@tanstack/react-router"

beforeAll(() => {
  // Initialize i18n with a default locale if needed
  if (!i18n.locale) {
    i18n.activate("en")
  }
})

// Mock the UserMenu component
vi.mock("./UserMenu", () => ({
  UserMenu: () => <div data-testid="user-menu">User Menu</div>,
}))

// Mock the Logo component
vi.mock("../../assets/logo.svg?react", () => ({
  default: () => <div data-testid="aurora-logo">Logo</div>,
}))

// Testing provider that wraps components with i18n
const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("MainNavigation", () => {
  // Helper function to create a test router with route loaders that include crumb data
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

    const accountsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/accounts",
      component: () => <Outlet />,
    })

    const domainRoute = createRoute({
      getParentRoute: () => accountsRoute,
      path: "/$accountId",
      loader: ({ params }) => ({
        crumbDomain: {
          id: params.accountId,
          name: `Test Domain (${params.accountId})`,
        },
      }),
      component: () => <Outlet />,
    })

    const projectsRoute = createRoute({
      getParentRoute: () => domainRoute,
      path: "/projects",
      component: () => <div>Projects Page</div>,
    })

    const projectRoute = createRoute({
      getParentRoute: () => projectsRoute,
      path: "/$projectId",
      loader: ({ params }) => ({
        crumbProject: {
          id: params.projectId,
          name: `Test Project (${params.projectId})`,
          domain_id: params.accountId,
          description: "A test project",
          enabled: true,
          links: {
            self: `https://example.com/${params.projectId}`,
          },
        },
      }),
      component: () => <div>Project Content</div>,
    })

    const routeTree = rootRoute.addChildren([
      homeRoute,
      aboutRoute,
      accountsRoute.addChildren([domainRoute.addChildren([projectsRoute.addChildren([projectRoute])])]),
    ])

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
    expect(screen.getByTestId("aurora-logo")).toBeDefined()
    expect(screen.getByText("Aurora")).toBeDefined()

    // Check if navigation items are rendered
    expect(screen.getByText("Home")).toBeDefined()
    expect(screen.getByText("About")).toBeDefined()

    // Check if user menu is rendered
    expect(screen.getByTestId("user-menu")).toBeDefined()
  })

  test("renders domain name when route includes domain data", async () => {
    await act(async () => {
      i18n.activate("en")
    })

    const router = createTestRouter(<MainNavigation items={mainNavItems} />)

    // Navigate to a domain route first using the correct syntax with params
    await router.navigate({
      to: "/accounts/$accountId/projects",
      params: { accountId: "domain1" },
    })

    await waitFor(() => render(<RouterProvider router={router} />))

    // Check if domain name is rendered
    await waitFor(() => {
      expect(screen.getByText("Test Domain (domain1)")).toBeDefined()
      expect(screen.getByTestId("domain-link")).toBeDefined()
    })
  })

  test("renders project name when route includes project data", async () => {
    await act(async () => {
      i18n.activate("en")
    })

    const router = createTestRouter(<MainNavigation items={mainNavItems} />)

    // Navigate to a project route with the correct syntax using params
    await router.navigate({
      to: "/accounts/$accountId/projects/$projectId",
      params: {
        accountId: "domain1",
        projectId: "project1",
      },
    })

    await waitFor(() => render(<RouterProvider router={router} />))

    // Check if domain and project names are rendered
    await waitFor(() => {
      expect(screen.getByText("Test Domain (domain1)")).toBeDefined()
      expect(screen.getByText("Test Project (project1)")).toBeDefined()
    })
  })

  test("domain link navigates to projects page", async () => {
    await act(async () => {
      i18n.activate("en")
    })

    const router = createTestRouter(<MainNavigation items={mainNavItems} />)

    // Navigate to a domain route first
    await router.navigate({
      to: "/accounts/$accountId/projects/$projectId",
      params: {
        accountId: "domain1",
        projectId: "project1",
      },
    })

    await waitFor(() => render(<RouterProvider router={router} />))

    // Click on the domain link
    await waitFor(async () => {
      const domainLink = screen.getByTestId("domain-link")
      await fireEvent.click(domainLink)

      expect(screen.getByText("Test Domain (domain1)")).toBeDefined()
    })
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
})
