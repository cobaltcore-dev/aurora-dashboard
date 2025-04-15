import { render, screen, fireEvent } from "@testing-library/react"
import { ProjectCardView } from "./ProjectCardView"
import { describe, test, expect, vi } from "vitest"
import { createMemoryHistory, createRouter, createRoute, RouterProvider, createRootRoute } from "@tanstack/react-router"
import { JSX } from "react/jsx-runtime"

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
  // Helper function to create a test router
  const createTestRouter = (Component: JSX.Element) => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    })

    const rootRoute = createRootRoute({
      component: () => Component,
    })

    // Create a route for the compute page to test navigation
    const computeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/accounts/$accountId/projects/$projectId/compute",
      component: () => <div>Compute</div>,
    })

    const routeTree = rootRoute.addChildren([computeRoute])

    return createRouter({
      routeTree,
      history: memoryHistory,
    })
  }

  test("renders project data correctly", () => {
    const router = createTestRouter(<ProjectCardView projects={projects} />)
    render(<RouterProvider router={router} />)

    expect(screen.getByText("Security Group")).toBeDefined()
    expect(screen.getByText("Manages security compliance and access control.")).toBeDefined()
  })

  test("clicking the title does trigger navigation", async () => {
    const router = createTestRouter(<ProjectCardView projects={projects} />)

    // Spy on router navigation
    const navigateSpy = vi.spyOn(router, "navigate")

    render(<RouterProvider router={router} />)

    const title = screen.getByText("Security Group")
    await fireEvent.click(title)

    expect(navigateSpy).toHaveBeenCalledTimes(1)
    expect(navigateSpy).toHaveBeenCalledWith({
      from: undefined,
      to: "/accounts/1789d1/projects/89ac3f/compute",
    })
  })

  test("clicking the card navigates correctly", async () => {
    const router = createTestRouter(<ProjectCardView projects={projects} />)

    // Spy on router navigation
    const navigateSpy = vi.spyOn(router, "navigate")

    render(<RouterProvider router={router} />)

    const card = screen.getByText("Security Group").closest("div")
    await fireEvent.click(card!)

    // Check that navigate was called with the correct path
    expect(navigateSpy).toHaveBeenCalledTimes(1)
    expect(navigateSpy).toHaveBeenCalledWith({
      from: undefined,
      to: "/accounts/1789d1/projects/89ac3f/compute",
    })
  })
})
