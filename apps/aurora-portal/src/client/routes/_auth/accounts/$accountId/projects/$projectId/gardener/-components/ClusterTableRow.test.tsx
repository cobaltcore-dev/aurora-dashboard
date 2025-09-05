import { ReactElement } from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { Cluster } from "@/server/Gardener/types/cluster"
import {
  createRoute,
  createRootRoute,
  RouterProvider,
  createMemoryHistory,
  createRouter,
  AnyRouter,
} from "@tanstack/react-router"
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

  const rootRoute = createRootRoute()

  // Create the _auth route
  const authRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_auth",
  })

  // Create accounts route with parameter (this matches $accountId)
  const accountsRoute = createRoute({
    getParentRoute: () => authRoute,
    path: "/accounts/$accountId",
  })

  // Create projects route with parameter (this matches $projectId)
  const projectsRoute = createRoute({
    getParentRoute: () => accountsRoute,
    path: "/projects/$projectId",
  })

  // Create gardener route
  const gardenerRoute = createRoute({
    getParentRoute: () => projectsRoute,
    path: "/gardener",
  })

  // Create clusters route - this is where your component lives
  const clustersRoute = createRoute({
    getParentRoute: () => gardenerRoute,
    path: "/clusters/",
    component: () => Component,
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

const setup = (router: AnyRouter) => {
  return render(
    <I18nProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nProvider>
  )
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
    await act(async () => {
      i18n.activate("en")
    })
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

    setup(router)

    const statusIcon = screen.getByTestId("status-icon")
    expect(statusIcon).toBeInTheDocument()
    expect(statusIcon).toHaveClass("text-theme-success")
  })

  it("displays correct status icon and color for Error status", () => {
    const errorCluster = { ...defaultCluster, status: "Error" }

    const router = createTestRouter(<ClusterTableRow cluster={errorCluster} />)

    setup(router)

    const statusIcon = screen.getByTestId("status-icon")
    expect(statusIcon).toBeInTheDocument()
    expect(statusIcon).toHaveClass("text-theme-danger")
  })

  it("renders readiness conditions with correct badges", () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)

    setup(router)

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

    setup(router)

    const errorIcon = screen.getByTestId("maintenance-error-icon")
    expect(errorIcon).toBeInTheDocument()
    expect(errorIcon).toHaveClass("text-theme-error")
  })

  it("copies cluster ID to clipboard when ID is clicked", async () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)

    setup(router)

    const clusterId = screen.getByText("ID: 12345678...")
    fireEvent.click(clusterId)

    expect(mockClipboardWriteText).toHaveBeenCalledWith(defaultCluster.uid)

    // Check that the toast appears with the success message
    await waitFor(() => {
      expect(screen.getByText("Cluster ID copied to clipboard")).toBeInTheDocument()
    })
  })

  it("renders cluster name as a link with correct href", () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)

    setup(router)

    const clusterLink = screen.getByText("test-cluster").closest("a")
    expect(clusterLink).toHaveAttribute(
      "href",
      "/accounts/test-account/projects/test-project/gardener/clusters/test-cluster"
    )
    expect(clusterLink).toHaveClass("text-theme-default hover:text-theme-link")
  })

  it("renders View Details button with correct link", () => {
    const router = createTestRouter(<ClusterTableRow cluster={defaultCluster} />)

    setup(router)

    const viewDetailsButton = screen.getByRole("button", { name: "View Details" })
    const link = viewDetailsButton.closest("a")
    expect(link).toHaveAttribute("href", "/accounts/test-account/projects/test-project/gardener/clusters/test-cluster")
    expect(viewDetailsButton).toHaveClass("juno-button-primary")
  })

  it("handles missing readiness conditions gracefully", () => {
    const clusterWithoutConditions = {
      ...defaultCluster,
      readiness: { status: "", conditions: [] },
    }

    const router = createTestRouter(<ClusterTableRow cluster={clusterWithoutConditions} />)

    setup(router)

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

    setup(router)

    const badges = screen.getAllByText(/Ready|Control Plane Unhealthy|Unknown Status/)
    expect(badges).toHaveLength(3)
    expect(badges[0]).toHaveClass("juno-badge-success")
    expect(badges[1]).toHaveClass("juno-badge-error")
    expect(badges[2]).toHaveClass("juno-badge-warning")
  })
})
