import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ProjectListView } from "./ProjectListView"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { createMemoryHistory, createRouter, RouterProvider, createRootRoute, createRoute } from "@tanstack/react-router"
import { JSX } from "react/jsx-runtime"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

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
  {
    domain_id: "2789d2",
    enabled: false,
    id: "89ac3g",
    links: {
      self: "https://example.com/identity/v3/projects/89ac3g",
    },
    name: "Database Management",
    description: "Handles database operations and maintenance.",
  },
]

describe("ProjectListView", () => {
  // Helper function to create a test router
  const createTestRouter = (Component: JSX.Element) => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    })

    const rootRoute = createRootRoute({
      component: () => <I18nProvider i18n={i18n}>{Component}</I18nProvider>,
    })

    // Add a dummy compute route for navigation testing
    const computeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/accounts/$domain/projects/$projectId/compute",
      component: () => <div>Compute Page</div>,
    })

    const routeTree = rootRoute.addChildren([computeRoute])

    return createRouter({
      routeTree,
      history: memoryHistory,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  test("renders without crashing when no projects", async () => {
    const router = createTestRouter(<ProjectListView projects={undefined} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText(/no projects found/i)).toBeInTheDocument()
    })
  })

  test("renders without crashing when empty projects array", async () => {
    const router = createTestRouter(<ProjectListView projects={[]} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText(/no projects found/i)).toBeInTheDocument()
    })
  })

  test("renders project data correctly", async () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    expect(screen.getByText("Manages security compliance and access control.")).toBeInTheDocument()
  })

  test("renders multiple projects", async () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    expect(screen.getByText("Database Management")).toBeInTheDocument()
    expect(screen.getByText("Handles database operations and maintenance.")).toBeInTheDocument()
  })

  test("renders enabled project with checkmark icon", async () => {
    const router = createTestRouter(<ProjectListView projects={[projects[0]]} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    // Check for checkCircle icon (enabled status)
    const checkCircleIcon = screen.getByRole("img", { hidden: true, name: /checkCircle/i })
    expect(checkCircleIcon).toBeInTheDocument()
  })

  test("renders disabled project with info icon", async () => {
    const router = createTestRouter(<ProjectListView projects={[projects[1]]} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Database Management")).toBeInTheDocument()
    })

    // Check for info icon (disabled status)
    const infoIcon = screen.getByRole("img", { hidden: true, name: /info/i })
    expect(infoIcon).toBeInTheDocument()
  })

  test("clicking the project title triggers navigation", async () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)

    // Spy on router navigation
    const navigateSpy = vi.spyOn(router, "navigate")

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    const title = screen.getByText("Security Group")
    fireEvent.click(title)

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledTimes(1)
    })

    // Verify navigation path
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/accounts/1789d1/projects/89ac3f/compute",
      })
    )
  })

  test("clicking the row navigates correctly", async () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)

    // Spy on router navigation
    const navigateSpy = vi.spyOn(router, "navigate")

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    // Get the row by finding the project name and getting its parent DataGridRow
    const projectCell = screen.getByText("Security Group")
    const row = projectCell.closest("[role='row']") || projectCell.closest("div")

    if (row) {
      fireEvent.click(row)

      await waitFor(() => {
        expect(navigateSpy).toHaveBeenCalled()
      })
    }
  })

  test("renders data grid with correct structure", async () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    // Verify the grid is rendered
    const grid = screen.getByRole("grid")
    expect(grid).toBeInTheDocument()
  })

  test("renders correct number of project rows", async () => {
    const router = createTestRouter(<ProjectListView projects={projects} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    // Check that both project names are present (2 projects)
    const securityGroup = screen.getByText("Security Group")
    const databaseManagement = screen.getByText("Database Management")

    expect(securityGroup).toBeInTheDocument()
    expect(databaseManagement).toBeInTheDocument()
  })
})
