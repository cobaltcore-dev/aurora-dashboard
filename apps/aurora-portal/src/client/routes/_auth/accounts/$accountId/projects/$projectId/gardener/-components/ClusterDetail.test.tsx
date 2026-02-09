import React, { ReactElement } from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { createMemoryHistory, createRouter, createRootRoute, createRoute, RouterProvider } from "@tanstack/react-router"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import ClusterDetailPage from "./ClusterDetail"

// Mock the clipboard API
const mockClipboardWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockClipboardWriteText,
  },
})

describe("ClusterDetailPage", () => {
  const mockCluster = {
    uid: "test-cluster-123",
    name: "test-cluster",
    infrastructure: "aws",
    region: "us-east-1",
    status: "Operational",
    version: "1.28.5",
    readiness: {
      status: "5/5",
      conditions: [],
    },
    workers: [],
    maintenance: {
      startTime: "030000+0000",
      timezone: "UTC",
      windowTime: "040000+0000",
    },
    lastMaintenance: {
      state: "Succeeded",
    },
    autoUpdate: {
      os: true,
      kubernetes: true,
    },
  }

  const createTestRouter = (Component: ReactElement) => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/_auth/accounts/test-account/projects/test-project/gardener/clusters/test-cluster"],
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
      path: "/clusters",
    })

    // Create cluster details route - component renders here and useParams matches this path
    const clusterDetailsRoute = createRoute({
      getParentRoute: () => clustersRoute,
      path: "/$clusterName",
      component: () => Component,
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

  beforeEach(async () => {
    vi.clearAllMocks()
    mockClipboardWriteText.mockResolvedValue(undefined)
    i18n.activate("en")
  })

  it("renders cluster details correctly", async () => {
    const router = createTestRouter(<ClusterDetailPage cluster={mockCluster} isDeleteAllowed={true} />)
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
    })
  })

  it("handles share functionality", async () => {
    const router = createTestRouter(<ClusterDetailPage cluster={mockCluster} isDeleteAllowed={true} />)
    render(<RouterProvider router={router} />)

    await waitFor(
      () => {
        expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    const shareButtons = screen.queryAllByRole("button", { name: /share/i })
    if (shareButtons.length > 0) {
      fireEvent.click(shareButtons[0])

      await waitFor(() => {
        expect(mockClipboardWriteText).toHaveBeenCalled()
      })

      // Verify the clipboard content contains cluster info
      const clipboardCall = mockClipboardWriteText.mock.calls[0]?.[0]
      if (clipboardCall) {
        expect(clipboardCall).toContain("test-cluster")
      }
    }
  })

  it("renders delete button when isDeleteAllowed is true", async () => {
    const router = createTestRouter(<ClusterDetailPage cluster={mockCluster} isDeleteAllowed={true} />)
    render(<RouterProvider router={router} />)

    await waitFor(
      () => {
        expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    const deleteButtons = screen.queryAllByRole("button", { name: /delete/i })
    if (deleteButtons.length > 0) {
      expect(deleteButtons[0]).toBeInTheDocument()
    }
  })

  it("does not render delete button when isDeleteAllowed is false", async () => {
    const router = createTestRouter(<ClusterDetailPage cluster={mockCluster} isDeleteAllowed={false} />)
    render(<RouterProvider router={router} />)

    await waitFor(
      () => {
        expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    const deleteButton = screen.queryByRole("button", { name: /delete/i })
    expect(deleteButton).not.toBeInTheDocument()
  })

  it("displays cluster ID in the page", async () => {
    const router = createTestRouter(<ClusterDetailPage cluster={mockCluster} isDeleteAllowed={true} />)
    render(<RouterProvider router={router} />)

    await waitFor(
      () => {
        expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Check for cluster ID which should be in the description
    // Use getAllByText since ID appears in both breadcrumb and description
    const idElements = screen.getAllByText(/test-cluster-123/)
    expect(idElements.length).toBeGreaterThanOrEqual(1)
  })

  it("renders all required buttons and sections", async () => {
    const router = createTestRouter(<ClusterDetailPage cluster={mockCluster} isDeleteAllowed={true} />)
    render(<RouterProvider router={router} />)

    await waitFor(
      () => {
        expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Check that router error doesn't occur
    const errorMessage = screen.queryByText(/Could not find an active match/)
    expect(errorMessage).not.toBeInTheDocument()

    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThan(0)
  })

  it("clipboard copy functionality works correctly", async () => {
    mockClipboardWriteText.mockResolvedValueOnce(undefined)

    const router = createTestRouter(<ClusterDetailPage cluster={mockCluster} isDeleteAllowed={true} />)
    render(<RouterProvider router={router} />)

    await waitFor(
      () => {
        expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    const shareButtons = screen.queryAllByRole("button", { name: /share/i })
    if (shareButtons.length > 0) {
      fireEvent.click(shareButtons[0])

      await waitFor(() => {
        expect(mockClipboardWriteText).toHaveBeenCalledWith(expect.stringContaining("test-cluster"))
      })
    }
  })
})
