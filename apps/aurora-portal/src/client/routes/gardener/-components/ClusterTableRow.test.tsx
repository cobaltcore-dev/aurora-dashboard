import { ReactElement } from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { Cluster } from "@/server/Gardener/types/cluster"
import { createRoute, createRootRoute, RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import ClusterTableRow from "./ClusterTableRow"

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))

// Mock navigator.clipboard
const mockClipboardWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockClipboardWriteText,
  },
})

const createTestRouter = (Component: ReactElement) => {
  const memoryHistory = createMemoryHistory({
    initialEntries: ["/"],
  })

  const rootRoute = createRootRoute({
    component: () => Component,
  })

  // Create a route for the cluster details page to test navigation
  const computeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/gardener/clusters/$clusterName",
    component: () => <div>cluster Details</div>,
  })

  const routeTree = rootRoute.addChildren([computeRoute])

  return createRouter({
    routeTree,
    history: memoryHistory,
  })
}

describe("ClusterTableRow", () => {
  const defaultCluster = {
    uid: "12345678-1234-1234-1234-1234567890ab",
    name: "test-cluster",
    status: "Operational",
    readiness: {
      conditions: [
        { type: "Ready", status: "True", displayValue: "Ready" },
        { type: "ControlPlaneHealthy", status: "True", displayValue: "Control Plane Healthy" },
      ],
    },
    purpose: "Testing",
    infrastructure: "AWS",
    version: "1.25.0",
    lastMaintenance: { state: "Succeeded" },
  } as Cluster

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders cluster data correctly", () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    // Check DataGridRow
    expect(screen.getByRole("row")).toBeInTheDocument()

    // Check DataGridCells
    const cells = screen.getAllByRole("gridcell")
    expect(cells).toHaveLength(8) // 8 cells in the row

    // Check status
    expect(screen.getByText("Operational")).toBeInTheDocument()

    // Check cluster name and ID
    expect(screen.getByText("test-cluster")).toBeInTheDocument()
    expect(screen.getByText("ID: 12345678...")).toBeInTheDocument()

    // Check purpose and infrastructure
    expect(screen.getByText("Testing")).toBeInTheDocument()
    expect(screen.getByText("AWS")).toBeInTheDocument()

    // Check version
    expect(screen.getByText("1.25.0")).toBeInTheDocument()

    // Check View Details button
    expect(screen.getByRole("button", { name: "View Details" })).toBeInTheDocument()
  })

  it("displays correct status icon and color for Operational status", () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    const statusIcon = screen.getByTestId("status-icon")
    expect(statusIcon).toBeInTheDocument()
    expect(statusIcon).toHaveClass("text-theme-success")
  })

  it("displays correct status icon and color for Error status", () => {
    const errorCluster = { ...defaultCluster, status: "Error" }

    const router = createTestRouter(<ClusterTableRow cluster={errorCluster} />)
    render(<RouterProvider router={router} />)

    const statusIcon = screen.getByTestId("status-icon")
    expect(statusIcon).toBeInTheDocument()
    expect(statusIcon).toHaveClass("text-theme-danger")
  })

  it("renders readiness conditions with correct badges", () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    const badges = screen.getAllByText(/Ready|Control Plane Healthy/)
    expect(badges).toHaveLength(2)
    expect(badges[0]).toHaveTextContent("Ready")
    expect(badges[0]).toHaveClass("juno-badge-success")
    expect(badges[1]).toHaveTextContent("Control Plane Healthy")
    expect(badges[1]).toHaveClass("juno-badge-success")
  })

  it("renders error icon for version when lastMaintenance state is Error", () => {
    const errorMaintenanceCluster = {
      ...defaultCluster,
      lastMaintenance: { state: "Error" },
    }

    const router = createTestRouter(<ClusterTableRow cluster={errorMaintenanceCluster} />)
    render(<RouterProvider router={router} />)

    const errorIcon = screen.getByTestId("maintenance-error-icon")
    expect(errorIcon).toBeInTheDocument()
    expect(errorIcon).toHaveClass("text-theme-error")
  })

  it("copies cluster ID to clipboard when ID is clicked", async () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    const clusterId = screen.getByText("ID: 12345678...")
    fireEvent.click(clusterId)

    expect(mockClipboardWriteText).toHaveBeenCalledWith(defaultCluster.uid)
    expect(toast.success).toHaveBeenCalledWith("Cluster ID copied to clipboard")
  })

  it("renders cluster name as a link with correct href", () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    const clusterLink = screen.getByText("test-cluster").closest("a")
    expect(clusterLink).toHaveAttribute("href", "/gardener/clusters/test-cluster")
    expect(clusterLink).toHaveClass("text-theme-default hover:text-theme-link")
  })

  it("renders View Details button with correct link", () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)
    render(<RouterProvider router={router} />)

    const viewDetailsButton = screen.getByRole("button", { name: "View Details" })
    const link = viewDetailsButton.closest("a")
    expect(link).toHaveAttribute("href", "/gardener/clusters/test-cluster")
    expect(viewDetailsButton).toHaveClass("juno-button-primary")
  })

  it("handles missing readiness conditions gracefully", () => {
    const clusterWithoutConditions = {
      ...defaultCluster,
      readiness: { status: "", conditions: [] },
    }

    const router = createTestRouter(<ClusterTableRow cluster={clusterWithoutConditions} />)
    render(<RouterProvider router={router} />)

    expect(screen.queryAllByText(/Ready|Control Plane Healthy/)).toHaveLength(0)
    expect(screen.getByRole("row")).toBeInTheDocument()
  })

  it("handles different readiness condition statuses", () => {
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

    const badges = screen.getAllByText(/Ready|Control Plane Unhealthy|Unknown Status/)
    expect(badges).toHaveLength(3)
    expect(badges[0]).toHaveClass("juno-badge-success")
    expect(badges[1]).toHaveClass("juno-badge-error")
    expect(badges[2]).toHaveClass("juno-badge-warning")
  })
})
