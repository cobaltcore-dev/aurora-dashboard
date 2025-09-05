import React, { ReactElement } from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { createMemoryHistory, createRouter, createRootRoute, createRoute, RouterProvider } from "@tanstack/react-router"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import ClusterDetailPage from "./ClusterDetail"

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
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

    const rootRoute = createRootRoute()

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

    // Create clusters route - this renders your component and matches the useParams call
    const clustersRoute = createRoute({
      getParentRoute: () => gardenerRoute,
      path: "/clusters/",
      component: () => Component,
    })

    // Create cluster details route for navigation
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

  const setup = (isDeleteAllowed = true) => {
    const router = createTestRouter(
      <I18nProvider i18n={i18n}>
        <ClusterDetailPage cluster={mockCluster} isDeleteAllowed={isDeleteAllowed} />
      </I18nProvider>
    )

    return render(<RouterProvider router={router} />)
  }

  beforeEach(async () => {
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)

    await act(async () => {
      i18n.activate("en")
    })
  })

  it("navigates back when breadcrumb is clicked", () => {
    setup()

    fireEvent.click(screen.getByText("Clusters"))

    waitFor(() => fireEvent.click(screen.getByText("Clusters List")))
  })

  it("handles share functionality", async () => {
    setup()

    const shareButton = screen.getByRole("button", { name: /share/i })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })

  it("renders delete button", () => {
    setup()

    const deleteButton = screen.getByRole("button", { name: /delete/i })
    expect(deleteButton).toBeInTheDocument()
  })

  it("does not render delete button", () => {
    setup(false)

    const deleteButton = screen.queryByRole("button", { name: /delete/i })
    expect(deleteButton).not.toBeInTheDocument()
  })
})
