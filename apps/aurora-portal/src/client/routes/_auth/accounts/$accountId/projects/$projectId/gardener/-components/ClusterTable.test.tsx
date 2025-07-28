import { ReactElement } from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Cluster } from "@/server/Gardener/types/cluster"
import { createRootRoute, createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { ClusterTable } from "./ClusterTable"

const createTestRouter = (Component: ReactElement) => {
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

  describe("Empty State", () => {
    it("should render empty state when no clusters are provided", () => {
      const router = createTestRouter(<ClusterTable {...defaultProps} />)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("No clusters found")).toBeInTheDocument()
      expect(screen.getByText("No Kubernetes clusters match your current filter criteria")).toBeInTheDocument()
      expect(screen.getByTestId("icon-info")).toBeInTheDocument()
    })

    it("should show correct summary with zero clusters", () => {
      const router = createTestRouter(<ClusterTable clusters={[]} filteredCount={5} />)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("0")).toBeInTheDocument()
      expect(screen.getByText("out of")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("clusters")).toBeInTheDocument()
    })
  })

  describe("Header and Summary", () => {
    it("should display correct cluster counts in summary", () => {
      const clusters = [createMockCluster({ name: "cluster-1" }), createMockCluster({ name: "cluster-2" })]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={10} />)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("out of")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("clusters")).toBeInTheDocument()
    })

    it("should display last update time from most recent cluster transition", () => {
      const clusters = [
        createMockCluster({
          name: "cluster-1",
          stateDetails: { lastTransitionTime: "2024-01-10T10:00:00Z" },
        }),
        createMockCluster({
          name: "cluster-2",
          stateDetails: { lastTransitionTime: "2024-01-15T15:30:00Z" },
        }),
        createMockCluster({
          name: "cluster-3",
          stateDetails: { lastTransitionTime: "2024-01-12T12:00:00Z" },
        }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={3} />)
      render(<RouterProvider router={router} />)

      // Should show the most recent date (2024-01-15T15:30:00Z)
      expect(screen.getByText("Last Update")).toBeInTheDocument()
      expect(screen.getByText(/Mon, 15 Jan 2024 15:30:00 GMT/)).toBeInTheDocument()
    })

    it("should handle clusters without lastTransitionTime", () => {
      const clusters = [
        createMockCluster({
          name: "cluster-1",
          stateDetails: { lastTransitionTime: "2024-01-15T10:00:00Z" },
        }),
        createMockCluster({
          name: "cluster-2",
          stateDetails: undefined,
        }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={2} />)
      render(<RouterProvider router={router} />)

      // Should still display the valid date
      expect(screen.getByText(/Mon, 15 Jan 2024 10:00:00 GMT/)).toBeInTheDocument()
    })
  })

  describe("Table Headers", () => {
    it("should render all table headers when clusters are present", () => {
      const clusters = [createMockCluster()]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      // Check for header cells
      expect(screen.getByTestId("status-header-icon")).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
      expect(screen.getByText("Readiness")).toBeInTheDocument()
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Purpose")).toBeInTheDocument()
      expect(screen.getByText("Infrastructure")).toBeInTheDocument()
      expect(screen.getByText("Version")).toBeInTheDocument()
    })

    it("should not render table headers when no clusters are present", () => {
      const router = createTestRouter(<ClusterTable {...defaultProps} />)
      render(<RouterProvider router={router} />)

      expect(screen.queryByText("Status")).not.toBeInTheDocument()
      expect(screen.queryByText("Name")).not.toBeInTheDocument()
      expect(screen.queryByText("Purpose")).not.toBeInTheDocument()
    })
  })

  describe("Cluster Rendering", () => {
    it("should render single cluster correctly", () => {
      const cluster = createMockCluster({
        name: "my-test-cluster",
        status: "operational",
        purpose: "development",
        infrastructure: "gcp",
        version: "1.29.0",
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("my-test-cluster")).toBeInTheDocument()
      expect(screen.getByText("operational")).toBeInTheDocument()
      expect(screen.getByText("development")).toBeInTheDocument()
      expect(screen.getByText("gcp")).toBeInTheDocument()
      expect(screen.getByText("1.29.0")).toBeInTheDocument()
    })

    it("should render multiple clusters correctly", () => {
      const clusters = [
        createMockCluster({ name: "cluster-1", status: "operational" }),
        createMockCluster({ name: "cluster-2", status: "warning" }),
        createMockCluster({ name: "cluster-3", status: "error" }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={3} />)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("cluster-1")).toBeInTheDocument()
      expect(screen.getByText("cluster-2")).toBeInTheDocument()
      expect(screen.getByText("cluster-3")).toBeInTheDocument()
      expect(screen.getByText("operational")).toBeInTheDocument()
      expect(screen.getByText("warning")).toBeInTheDocument()
      expect(screen.getByText("error")).toBeInTheDocument()
    })

    it("should render cluster readiness conditions", () => {
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

      expect(screen.getByText("API Server Available")).toBeInTheDocument()
      expect(screen.getByText("Control Plane Unhealthy")).toBeInTheDocument()
    })

    it("should render maintenance error indicators", () => {
      const cluster = createMockCluster({
        lastMaintenance: {
          state: "Error",
        },
        version: "1.28.0",
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      expect(screen.getByTestId("maintenance-error-icon")).toBeInTheDocument()
      expect(screen.getByText("1.28.0")).toBeInTheDocument()
    })

    it("should render cluster ID and make it clickable", () => {
      const cluster = createMockCluster({
        uid: "very-long-cluster-uid-12345",
        name: "test-cluster",
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      const idElement = screen.getByText(/ID: very-lon.../)
      expect(idElement).toBeInTheDocument()
      expect(idElement).toHaveAttribute("title", "Click to copy ID")
    })

    it("should render view details buttons for each cluster", () => {
      const clusters = [createMockCluster({ name: "cluster-1" }), createMockCluster({ name: "cluster-2" })]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={2} />)
      render(<RouterProvider router={router} />)

      const viewButtons = screen.getAllByText("View Details")
      expect(viewButtons).toHaveLength(2)
      viewButtons.forEach((button) => {
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe("Data Grid Configuration", () => {
    it("should configure DataGrid with correct properties", () => {
      const clusters = [createMockCluster()]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      const dataGrid = screen.getByRole("grid")
      expect(dataGrid).toHaveClass("alerts")
    })
  })

  describe("Edge Cases", () => {
    it("should handle clusters with missing optional fields", () => {
      const cluster = createMockCluster({
        stateDetails: undefined,
        lastMaintenance: {
          state: "Succeeded",
        },
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("test-cluster")).toBeInTheDocument()
      expect(screen.getByText("operational")).toBeInTheDocument()
    })

    it("should handle empty readiness conditions array", () => {
      const cluster = createMockCluster({
        readiness: {
          status: "",
          conditions: [],
        },
      })

      const router = createTestRouter(<ClusterTable clusters={[cluster]} filteredCount={1} />)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("test-cluster")).toBeInTheDocument()
    })

    it("should handle clusters with different status values", () => {
      const clusters = [
        createMockCluster({ name: "cluster-1", status: "running" }),
        createMockCluster({ name: "cluster-2", status: "pending" }),
        createMockCluster({ name: "cluster-3", status: "failed" }),
        createMockCluster({ name: "cluster-4", status: "unknown-status" }),
      ]

      const router = createTestRouter(<ClusterTable clusters={clusters} filteredCount={4} />)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("running")).toBeInTheDocument()
      expect(screen.getByText("pending")).toBeInTheDocument()
      expect(screen.getByText("failed")).toBeInTheDocument()
      expect(screen.getByText("unknown-status")).toBeInTheDocument()
    })
  })
})
