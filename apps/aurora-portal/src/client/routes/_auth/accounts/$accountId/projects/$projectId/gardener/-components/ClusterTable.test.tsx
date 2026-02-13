import { ReactElement } from "react"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { Cluster } from "@/server/Gardener/types/cluster"
import { createRootRoute, createMemoryHistory, createRouter, RouterProvider, createRoute } from "@tanstack/react-router"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ClusterTable } from "./ClusterTable"

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

  // Create cluster details route for link navigation
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

const createMockCluster = (overrides: Partial<Cluster> = {}) =>
  ({
    uid: "test-uid-123",
    name: "test-cluster",
    status: "operational",
    purpose: "production",
    infrastructure: "aws",
    version: "1.28.0",
    readiness: {
      conditions: [
        {
          type: "APIServerAvailable",
          status: "True",
          displayValue: "API Server Available",
        },
      ],
    },
    lastMaintenance: {
      state: "Succeeded",
    },
    stateDetails: {
      lastTransitionTime: "2024-01-15T10:30:00Z",
    },
    ...overrides,
  }) as Cluster

describe("ClusterTable", () => {
  const defaultProps = {
    clusters: [],
    filteredCount: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  describe("Empty State", () => {
    it("should render empty state when no clusters are provided", async () => {
      const router = createTestRouter(<ClusterTable {...defaultProps} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("No clusters found")).toBeInTheDocument()
      })

      expect(screen.getByText("No Kubernetes clusters match your current filter criteria")).toBeInTheDocument()
      expect(screen.getByTestId("icon-info")).toBeInTheDocument()
    })

    it("should show correct summary with zero clusters", async () => {
      const router = createTestRouter(<ClusterTable clusters={[]} filteredCount={5} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument()
      })

      expect(screen.getByText("out of")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("clusters")).toBeInTheDocument()
    })
  })

  describe("Header and Summary", () => {
    it("should display correct cluster counts in summary", async () => {
      const clusters = [
        createMockCluster({ name: "cluster-1" }),
        createMockCluster({ name: "cluster-2", uid: "test-uid-1234" }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={10} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument()
      })

      expect(screen.getByText("out of")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("clusters")).toBeInTheDocument()
    })

    it("should display last update time from most recent cluster transition", async () => {
      const clusters = [
        createMockCluster({
          name: "cluster-1",
          stateDetails: { lastTransitionTime: "2024-01-10T10:00:00Z" },
        }),
        createMockCluster({
          uid: "test-uid-1234",
          name: "cluster-2",
          stateDetails: { lastTransitionTime: "2024-01-15T15:30:00Z" },
        }),
        createMockCluster({
          uid: "test-uid-12345",
          name: "cluster-3",
          stateDetails: { lastTransitionTime: "2024-01-12T12:00:00Z" },
        }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={3} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("Last Update")).toBeInTheDocument()
      })

      // Should show the most recent date (2024-01-15T15:30:00Z)
      expect(screen.getByText(/15 Jan 2024/)).toBeInTheDocument()
    })

    it("should handle clusters without lastTransitionTime", async () => {
      const clusters = [
        createMockCluster({
          name: "cluster-1",
          stateDetails: { lastTransitionTime: "2024-01-15T10:00:00Z" },
        }),
        createMockCluster({
          uid: "test-uid-1234",
          name: "cluster-2",
          stateDetails: undefined,
        }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={2} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText(/15 Jan 2024/)).toBeInTheDocument()
      })
    })
  })

  describe("Table Headers", () => {
    it("should render all table headers when clusters are present", async () => {
      const clusters = [createMockCluster()]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("status-header-icon")).toBeInTheDocument()
      })

      // Check for header cells
      expect(screen.getByText("Status")).toBeInTheDocument()
      expect(screen.getByText("Readiness")).toBeInTheDocument()
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Purpose")).toBeInTheDocument()
      expect(screen.getByText("Infrastructure")).toBeInTheDocument()
      expect(screen.getByText("Version")).toBeInTheDocument()
    })

    it("should not render table headers when no clusters are present", async () => {
      const router = createTestRouter(<ClusterTable {...defaultProps} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("No clusters found")).toBeInTheDocument()
      })

      expect(screen.queryByText("Status")).not.toBeInTheDocument()
      expect(screen.queryByText("Name")).not.toBeInTheDocument()
      expect(screen.queryByText("Purpose")).not.toBeInTheDocument()
    })
  })

  describe("Cluster Rendering", () => {
    it("should render single cluster correctly", async () => {
      const cluster = createMockCluster({
        name: "my-test-cluster",
        status: "operational",
        purpose: "development",
        infrastructure: "gcp",
        version: "1.29.0",
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("my-test-cluster")).toBeInTheDocument()
      })

      expect(screen.getByText("operational")).toBeInTheDocument()
      expect(screen.getByText("development")).toBeInTheDocument()
      expect(screen.getByText("gcp")).toBeInTheDocument()
      expect(screen.getByText("1.29.0")).toBeInTheDocument()
    })

    it("should render multiple clusters correctly", async () => {
      const clusters = [
        createMockCluster({ name: "cluster-1", status: "operational" }),
        createMockCluster({ uid: "test-uid-1234", name: "cluster-2", status: "warning" }),
        createMockCluster({ uid: "test-uid-12345", name: "cluster-3", status: "error" }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={3} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("cluster-1")).toBeInTheDocument()
      })

      expect(screen.getByText("cluster-2")).toBeInTheDocument()
      expect(screen.getByText("cluster-3")).toBeInTheDocument()
      expect(screen.getByText("operational")).toBeInTheDocument()
      expect(screen.getByText("warning")).toBeInTheDocument()
      expect(screen.getByText("error")).toBeInTheDocument()
    })

    it("should render cluster readiness conditions", async () => {
      const cluster = createMockCluster({
        readiness: {
          status: "",
          conditions: [
            {
              type: "APIServerAvailable",
              status: "True",
              displayValue: "API Server Available",
            },
            {
              type: "ControlPlaneHealthy",
              status: "False",
              displayValue: "Control Plane Unhealthy",
            },
          ],
        },
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("API Server Available")).toBeInTheDocument()
      })

      expect(screen.getByText("Control Plane Unhealthy")).toBeInTheDocument()
    })

    it("should render maintenance error indicators", async () => {
      const cluster = createMockCluster({
        lastMaintenance: {
          state: "Error",
        },
        version: "1.28.0",
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("maintenance-error-icon")).toBeInTheDocument()
      })

      expect(screen.getByText("1.28.0")).toBeInTheDocument()
    })

    it("should render cluster ID and make it clickable", async () => {
      const cluster = createMockCluster({
        uid: "very-long-cluster-uid-12345",
        name: "test-cluster",
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText(/ID:/)).toBeInTheDocument()
      })

      const idElement = screen.getByText(/ID:/)
      expect(idElement).toHaveAttribute("title", "Click to copy ID")
    })

    it("should render view details buttons for each cluster", async () => {
      const clusters = [
        createMockCluster({ name: "cluster-1" }),
        createMockCluster({ uid: "test-uid-1234", name: "cluster-2" }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={2} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        const viewButtons = screen.getAllByText(/View Details/i)
        expect(viewButtons.length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe("Data Grid Configuration", () => {
    it("should configure DataGrid with correct properties", async () => {
      const clusters = [createMockCluster()]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        const dataGrid = screen.getByRole("grid")
        expect(dataGrid).toHaveClass("alerts")
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle clusters with missing optional fields", async () => {
      const cluster = createMockCluster({
        stateDetails: undefined,
        lastMaintenance: {
          state: "Succeeded",
        },
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("test-cluster")).toBeInTheDocument()
      })

      expect(screen.getByText("operational")).toBeInTheDocument()
    })

    it("should handle empty readiness conditions array", async () => {
      const cluster = createMockCluster({
        readiness: {
          status: "",
          conditions: [],
        },
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("test-cluster")).toBeInTheDocument()
      })
    })

    it("should handle clusters with different status values", async () => {
      const clusters = [
        createMockCluster({ name: "cluster-1", status: "running" }),
        createMockCluster({ uid: "test-uid-1234", name: "cluster-2", status: "pending" }),
        createMockCluster({ uid: "test-uid-12345", name: "cluster-3", status: "failed" }),
        createMockCluster({ uid: "test-uid-123456", name: "cluster-4", status: "unknown-status" }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={4} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("running")).toBeInTheDocument()
      })

      expect(screen.getByText("pending")).toBeInTheDocument()
      expect(screen.getByText("failed")).toBeInTheDocument()
      expect(screen.getByText("unknown-status")).toBeInTheDocument()
    })
  })
})
