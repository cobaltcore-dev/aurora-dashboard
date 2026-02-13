import { ReactElement } from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { Cluster } from "@/server/Gardener/types/cluster"
import { createRoute, createRootRoute, RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import ClusterTableRow from "./ClusterTableRow"

// Mock navigator.clipboard
const mockClipboardWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockClipboardWriteText,
  },
})

const createTestRouter = (Component: ReactElement) => {
  const memoryHistory = createMemoryHistory({
    initialEntries: ["/_auth/accounts/test-account/projects/test-project/gardener/clusters/"],
  })

  const rootRoute = createRootRoute({
    component: () => <I18nProvider i18n={i18n}>{Component}</I18nProvider>,
  })

  // Create the _auth route
  const authRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_auth",
  })

  // Create accounts route with parameter
  const accountsRoute = createRoute({
    getParentRoute: () => authRoute,
    path: "/accounts/$accountId",
  })

  // Create projects route with parameter
  const projectsRoute = createRoute({
    getParentRoute: () => accountsRoute,
    path: "/projects/$projectId",
  })

  // Create gardener route
  const gardenerRoute = createRoute({
    getParentRoute: () => projectsRoute,
    path: "/gardener",
  })

  // Create clusters route
  const clustersRoute = createRoute({
    getParentRoute: () => gardenerRoute,
    path: "/clusters/",
  })

  // Create cluster details route for navigation testing
  const clusterDetailsRoute = createRoute({
    getParentRoute: () => clustersRoute,
    path: "/$clusterName",
    component: () => <div>Cluster Details</div>,
  })

  const routeTree = rootRoute.addChildren([
    authRoute.addChildren([
      accountsRoute.addChildren([
        projectsRoute.addChildren([gardenerRoute.addChildren([clustersRoute.addChildren([clusterDetailsRoute])])]),
      ]),
    ]),
  ])

  return createRouter({
    routeTree,
    history: memoryHistory,
  })
}

describe("ClusterTableRow", () => {
  const defaultCluster: Cluster = {
    uid: "12345678-1234-1234-1234-1234567890ab",
    name: "test-cluster",
    status: "Operational",
    region: "",
    readiness: {
      status: "",
      conditions: [
        { type: "Ready", status: "True", displayValue: "Ready" },
        { type: "ControlPlaneHealthy", status: "True", displayValue: "Control Plane Healthy" },
      ],
    },
    purpose: "Testing",
    infrastructure: "AWS",
    version: "1.25.0",
    lastMaintenance: { state: "Succeeded" },
    workers: [],
    maintenance: {
      startTime: "",
      timezone: "",
      windowTime: "",
    },
    autoUpdate: { os: false, kubernetes: false },
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  it("renders cluster data correctly", async () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText("Operational")).toBeInTheDocument()
    })

    // Check status
    expect(screen.getByText("Operational")).toBeInTheDocument()

    // Check cluster name
    expect(screen.getByText("test-cluster")).toBeInTheDocument()

    // Check purpose and infrastructure
    expect(screen.getByText("Testing")).toBeInTheDocument()
    expect(screen.getByText("AWS")).toBeInTheDocument()

    // Check version
    expect(screen.getByText("1.25.0")).toBeInTheDocument()

    // Check View Details button
    expect(screen.getByRole("button", { name: /View Details/i })).toBeInTheDocument()
  })

  it("displays correct status icon and color for Operational status", async () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByTestId("status-icon")).toBeInTheDocument()
    })

    const statusIcon = screen.getByTestId("status-icon")
    expect(statusIcon).toHaveClass("text-theme-success")
  })

  it("displays correct status icon and color for Error status", async () => {
    const errorCluster = { ...defaultCluster, status: "Error" }
    const router = createTestRouter(<ClusterTableRow cluster={errorCluster} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByTestId("status-icon")).toBeInTheDocument()
    })

    const statusIcon = screen.getByTestId("status-icon")
    expect(statusIcon).toHaveClass("text-theme-danger")
  })

  it("renders readiness conditions with correct badges", async () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      const badges = screen.getAllByRole("img", { hidden: true })
      expect(badges.length).toBeGreaterThan(0)
    })

    // Check for the readiness condition text
    expect(screen.getByText("Ready")).toBeInTheDocument()
    expect(screen.getByText("Control Plane Healthy")).toBeInTheDocument()
  })

  it("renders error icon for version when lastMaintenance state is Error", async () => {
    const errorMaintenanceCluster = {
      ...defaultCluster,
      lastMaintenance: { state: "Error" },
    }
    const router = createTestRouter(<ClusterTableRow cluster={errorMaintenanceCluster} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByTestId("maintenance-error-icon")).toBeInTheDocument()
    })

    const errorIcon = screen.getByTestId("maintenance-error-icon")
    expect(errorIcon).toHaveClass("text-theme-error")
  })

  it("copies cluster ID to clipboard when ID is clicked", async () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText(/ID:/)).toBeInTheDocument()
    })

    const clusterId = screen.getByText(/ID:/)
    fireEvent.click(clusterId)

    expect(mockClipboardWriteText).toHaveBeenCalledWith(defaultCluster.uid)

    // Check that the toast appears with the success message
    await waitFor(() => {
      expect(screen.getByText(/Cluster ID copied/i)).toBeInTheDocument()
    })
  })

  it("renders cluster name as a link with correct href", async () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("test-cluster")).toBeInTheDocument()
    })

    const clusterLink = screen.getByText("test-cluster").closest("a")
    expect(clusterLink).toHaveAttribute(
      "href",
      "/accounts/test-account/projects/test-project/gardener/clusters/test-cluster"
    )
    expect(clusterLink).toHaveClass("text-theme-default")
  })

  it("renders View Details button with correct link", async () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /View Details/i })).toBeInTheDocument()
    })

    const viewDetailsButton = screen.getByRole("button", { name: /View Details/i })
    const link = viewDetailsButton.closest("a")
    expect(link).toHaveAttribute("href", "/accounts/test-account/projects/test-project/gardener/clusters/test-cluster")
  })

  it("handles missing readiness conditions gracefully", async () => {
    const clusterWithoutConditions = {
      ...defaultCluster,
      readiness: { status: "", conditions: [] },
    }
    const router = createTestRouter(<ClusterTableRow cluster={clusterWithoutConditions} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Operational")).toBeInTheDocument()
    })

    expect(screen.queryByText("Ready")).not.toBeInTheDocument()
    expect(screen.getByText("test-cluster")).toBeInTheDocument()
  })

  it("handles different readiness condition statuses", async () => {
    const clusterWithMixedConditions = {
      ...defaultCluster,
      readiness: {
        status: "",
        conditions: [
          { type: "Ready", status: "True", displayValue: "Ready" },
          { type: "ControlPlaneHealthy", status: "False", displayValue: "Control Plane Unhealthy" },
          { type: "Unknown", status: "Unknown", displayValue: "Unknown Status" },
        ],
      },
    }
    const router = createTestRouter(<ClusterTableRow cluster={clusterWithMixedConditions} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeInTheDocument()
    })

    expect(screen.getByText("Control Plane Unhealthy")).toBeInTheDocument()
    expect(screen.getByText("Unknown Status")).toBeInTheDocument()
  })
})
