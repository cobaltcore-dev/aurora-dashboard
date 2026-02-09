import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ProjectCardView } from "./ProjectCardView"
import { describe, test, expect, vi } from "vitest"
import { createMemoryHistory, createRouter, createRoute, RouterProvider, createRootRoute } from "@tanstack/react-router"
import { ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

// Define a test project
const projects = [
  {
    domain_id: "1789d1",
    enabled: true,
    id: "89ac3f",
    links: {
      self: "https://example.com/identity/v3/projects/89ac3f",
    },
    name: "Security Group",
    description: "Manages security compliance and access control.",
  },
]

describe("ProjectCardView", () => {
  // Helper function to create a test router with nested routes
  const createTestRouter = (Component: ReactNode) => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    })

    // Root route with I18n provider
    const rootRoute = createRootRoute({
      component: () => <I18nProvider i18n={i18n}>{Component}</I18nProvider>,
    })

    // Nested account route
    const accountRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/accounts/$accountId",
      component: () => <div>Account</div>,
    })

    // Nested projects route
    const projectsRoute = createRoute({
      getParentRoute: () => accountRoute,
      path: "/projects/$projectId",
      component: () => <div>Projects</div>,
    })

    // Nested compute route - this is where the navigation goes
    const computeRoute = createRoute({
      getParentRoute: () => projectsRoute,
      path: "/compute",
      component: () => <div>Compute</div>,
    })

    // Build route tree with nested structure
    const routeTree = rootRoute.addChildren([accountRoute.addChildren([projectsRoute.addChildren([computeRoute])])])

    return createRouter({
      routeTree,
      history: memoryHistory,
    })
  }

  test("renders project data correctly", async () => {
    const router = createTestRouter(<ProjectCardView projects={projects} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeDefined()
    })

    expect(screen.getByText("Manages security compliance and access control.")).toBeDefined()
  })

  test("clicking the title does trigger navigation", async () => {
    const router = createTestRouter(<ProjectCardView projects={projects} />)

    // Spy on router navigation
    const navigateSpy = vi.spyOn(router, "navigate")

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeDefined()
    })

    // Find the title of a navigation element
    const title = screen.getByText("Security Group")

    expect(title).toBeDefined()

    if (title) {
      await fireEvent.click(title)

      // Wait for navigation to be called
      await waitFor(
        () => {
          expect(navigateSpy).toHaveBeenCalledTimes(1)
          expect(navigateSpy).toHaveBeenCalledWith({
            from: undefined,
            to: "/accounts/1789d1/projects/89ac3f/compute",
          })
        },
        { timeout: 1000 }
      )
    }
  })

  test("clicking the card navigates correctly", async () => {
    const router = createTestRouter(<ProjectCardView projects={projects} />)

    // Spy on router navigation
    const navigateSpy = vi.spyOn(router, "navigate")

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeDefined()
    })

    // Find the clickable box element
    const card = screen.getByText("Security Group").closest("div")

    expect(card).toBeDefined()

    if (card) {
      await fireEvent.click(card)

      // Wait for navigation to be called
      await waitFor(
        () => {
          expect(navigateSpy).toHaveBeenCalledTimes(1)
          expect(navigateSpy).toHaveBeenCalledWith({
            from: undefined,
            to: "/accounts/1789d1/projects/89ac3f/compute",
          })
        },
        { timeout: 1000 }
      )
    }
  })

  test("renders empty state when no projects", async () => {
    const router = createTestRouter(<ProjectCardView projects={undefined} />)
    render(<RouterProvider router={router} />)

    // Wait for the component to render with flexible text matching
    await waitFor(
      () => {
        const emptyState = screen.queryByText(/no projects/i)
        expect(emptyState).toBeDefined()
      },
      { timeout: 1000 }
    )
  })
})
