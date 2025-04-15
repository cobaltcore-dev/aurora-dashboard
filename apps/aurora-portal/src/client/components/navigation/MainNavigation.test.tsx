import { describe, test, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MainNavigation } from "./MainNavigation"
import {
  createRootRoute,
  createRoute,
  RouterProvider,
  createRouter,
  Outlet,
  createMemoryHistory,
} from "@tanstack/react-router"

// Mock the fireEventMenu component
vi.mock("./fireEventMenu", () => ({
  fireEventMenu: () => <div data-testid="fireEvent-menu">fireEvent Menu</div>,
}))

// Mock the Logo component
vi.mock("../../assets/logo.svg?react", () => ({
  default: () => <div data-testid="aurora-logo">Logo</div>,
}))

describe("MainNavigation", () => {
  // Helper function to create a test router
  const createTestRouter = (Component: React.JSX.Element) => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    })

    const rootRoute = createRootRoute({
      component: () => (
        <div>
          {Component},
          <Outlet />,
        </div>
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
      path: "/accounts/$accountId/projects",
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

  test("renders logo and navigation items", () => {
    const router = createTestRouter(<MainNavigation items={mainNavItems} />)

    render(<RouterProvider router={router} />)

    // Check if logo is rendered
    expect(screen.getByTestId("aurora-logo")).toBeDefined()
    expect(screen.getByText("Aurora")).toBeDefined()

    // Check if navigation items are rendered
    expect(screen.getByText("Home")).toBeDefined()
    expect(screen.getByText("About")).toBeDefined()
  })

  test("renders domain name when domain is provided", () => {
    const mockDomain = {
      id: "domain1",
      name: "Test Domain",
    }

    const router = createTestRouter(<MainNavigation items={mainNavItems} domain={mockDomain} />)

    render(<RouterProvider router={router} />)

    // Check if domain name is rendered
    expect(screen.getByText("Test Domain")).toBeDefined()
    expect(screen.getByTestId("domain-link")).toBeDefined()
  })

  test("renders project name when project is provided", () => {
    const mockDomain = {
      id: "domain1",
      name: "Test Domain",
    }

    const mockProject = {
      id: "project1",
      name: "Test Project",
      domain_id: "domain1",
      description: "A test project",
      enabled: true,
      links: {
        self: "https://example.com/project1",
      },
    }

    const router = createTestRouter(<MainNavigation items={mainNavItems} domain={mockDomain} project={mockProject} />)

    render(<RouterProvider router={router} />)

    // Check if domain and project names are rendered
    expect(screen.getByText("Test Domain")).toBeDefined()
    expect(screen.getByText("Test Project")).toBeDefined()
  })

  test("domain link navigates to projects page", async () => {
    const mockDomain = {
      id: "domain1",
      name: "Test Domain",
    }

    const router = createTestRouter(<MainNavigation items={mainNavItems} domain={mockDomain} />)

    render(<RouterProvider router={router} />)

    // Click on the domain link
    // Find the logo link (the first link in the document)
    await waitFor(async () => {
      const domainLink = screen.getByTestId("domain-link")
      await fireEvent.click(domainLink)
      // Verify navigation was called with correct path

      // Now we should expect to see the content of the Projects Page
      expect(await screen.findByText("Projects Page")).toBeInTheDocument()
    })
  })

  test("logo link navigates to home page", async () => {
    const router = createTestRouter(<MainNavigation items={mainNavItems} />)

    render(<RouterProvider router={router} />)

    // Find the logo link (the first link in the document)
    await waitFor(async () => {
      const logoLink = screen.getAllByRole("link")[0]
      await fireEvent.click(logoLink)
      // Verify navigation was called with correct path

      // Now we should expect to see the content of the About page
      expect(await screen.findByText("Home Page")).toBeInTheDocument()
    })
  })

  test("navigation items have correct links", async () => {
    const router = createTestRouter(<MainNavigation items={mainNavItems} />)

    // Spy on router navigation

    render(<RouterProvider router={router} />)

    // Find the logo link (the first link in the document)
    await waitFor(async () => {
      const aboutLink = screen.getByText("About")
      await fireEvent.click(aboutLink)
      // Verify navigation was called with correct path

      // Now we should expect to see the content of the About page
      expect(await screen.queryByText("About Page Content")).toBeInTheDocument()
    })
  })

  test("renders custom navigation items when provided", () => {
    const customItems = [
      { route: "/dashboard", label: "Dashboard" },
      { route: "/settings", label: "Settings" },
    ]

    const router = createTestRouter(<MainNavigation items={customItems} />)

    render(<RouterProvider router={router} />)

    // Check if custom navigation items are rendered
    expect(screen.getByText("Dashboard")).toBeDefined()
    expect(screen.getByText("Settings")).toBeDefined()

    // Check that default items are not rendered
    expect(screen.queryByText("About")).toBeNull()
  })
})
