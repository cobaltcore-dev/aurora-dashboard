import { render, screen, fireEvent } from "@testing-library/react"
import { ProjectListView } from "./ProjectListView"
import { describe, test, expect, vi } from "vitest"
import { createMemoryHistory, createRouter, RouterProvider, createRootRoute } from "@tanstack/react-router"
import { JSX } from "react/jsx-runtime"

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

describe("ProjectListView", () => {
  // Helper function to create a test router
  const createTestRouter = (Component: JSX.Element) => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    })

    const rootRoute = createRootRoute({
      component: () => Component,
    })

    const routeTree = rootRoute.addChildren([])

    return createRouter({
      routeTree,
      history: memoryHistory,
    })
  }

  test("renders without crashing when no projects", () => {
    const router = createTestRouter(<ProjectListView projects={undefined} />)
    render(<RouterProvider router={router} />)

    expect(screen.getByText(/no projects found/i)).toBeDefined()
  })

  test("renders project data correctly", () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)
    render(<RouterProvider router={router} />)

    expect(screen.getByText("Security Group")).toBeDefined()
    expect(screen.getByText("Manages security compliance and access control.")).toBeDefined()
  })

  test("clicking the title triggers navigation", async () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)

    // Spy on router navigation
    const navigateSpy = vi.spyOn(router, "navigate")

    render(<RouterProvider router={router} />)

    const title = screen.getByText("Security Group")
    await fireEvent.click(title)

    // Check that navigate was called
    expect(navigateSpy).toHaveBeenCalledTimes(1)
  })

  test("clicking the popup menu does NOT trigger navigation", async () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)

    // Spy on router navigation
    const navigateSpy = vi.spyOn(router, "navigate")

    render(<RouterProvider router={router} />)

    const popupButton = screen.getByTestId("project-card-menu")
    await fireEvent.click(popupButton)

    // Verify navigation was not called
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  test("clicking the row navigates correctly", async () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)

    // Spy on router navigation
    const navigateSpy = vi.spyOn(router, "navigate")

    render(<RouterProvider router={router} />)

    const row = screen.getByText("Security Group").closest("div")
    await fireEvent.click(row!)

    // Check that navigate was called
    expect(navigateSpy).toHaveBeenCalledTimes(1)
  })
})
