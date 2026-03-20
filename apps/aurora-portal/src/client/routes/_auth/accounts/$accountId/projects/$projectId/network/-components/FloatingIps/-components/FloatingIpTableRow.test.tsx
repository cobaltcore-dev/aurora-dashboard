import { ReactElement } from "react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { createRoute, createRootRoute, RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { FloatingIpTableRow } from "./FloatingIpTableRow"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { FloatingIpUpdateFields } from "../../../floatingips/-components/-modals/EditFloatingIpModal"

const { mockUseUtils, mockUpdateMutation } = vi.hoisted(() => ({
  mockUseUtils: vi.fn(),
  mockUpdateMutation: vi.fn(),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: mockUseUtils,
    network: {
      floatingIp: {
        update: {
          useMutation: mockUpdateMutation,
        },
      },
    },
  },
}))

vi.mock("../../../floatingips/-components/-modals/EditFloatingIpModal", () => ({
  EditFloatingIpModal: ({
    open,
    onClose,
    onUpdate,
    floatingIp,
    isLoading,
    error,
  }: {
    open: boolean
    onClose: () => void
    onUpdate: (floatingIpId: string, data: FloatingIpUpdateFields) => Promise<void>
    floatingIp: FloatingIp
    isLoading: boolean
    error: string | null
  }) =>
    open ? (
      <div data-testid="edit-floating-ip-modal">
        <span data-testid="edit-modal-loading">{isLoading ? "loading" : "idle"}</span>
        <span data-testid="edit-modal-error">{error ?? ""}</span>
        <button onClick={onClose}>Close Edit Modal</button>
        <button
          onClick={() =>
            onUpdate(floatingIp.id, { port_id: floatingIp.port_id ?? null, description: "Updated description" })
          }
        >
          Save Edit
        </button>
      </div>
    ) : null,
}))

const createTestRouter = (Component: ReactElement) => {
  const memoryHistory = createMemoryHistory({
    initialEntries: ["/accounts/test-account/projects/test-project/network/"],
  })

  const rootRoute = createRootRoute({
    component: () => (
      <I18nProvider i18n={i18n}>
        <PortalProvider>{Component}</PortalProvider>
      </I18nProvider>
    ),
  })

  const accountsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "accounts/$accountId",
  })

  const projectsRoute = createRoute({
    getParentRoute: () => accountsRoute,
    path: "projects/$projectId",
  })

  const networkRoute = createRoute({
    getParentRoute: () => projectsRoute,
    path: "network",
  })

  const floatingIpsRoute = createRoute({
    getParentRoute: () => networkRoute,
    path: "floatingips",
  })

  const floatingIpDetailsRoute = createRoute({
    getParentRoute: () => floatingIpsRoute,
    path: "$floatingIpId",
  })

  const routeTree = rootRoute.addChildren([
    accountsRoute.addChildren([
      projectsRoute.addChildren([networkRoute.addChildren([floatingIpsRoute.addChildren([floatingIpDetailsRoute])])]),
    ]),
  ])

  return createRouter({
    routeTree,
    history: memoryHistory,
  })
}

describe("FloatingIpTableRow", () => {
  const listInvalidateMock = vi.fn()
  const getByIdInvalidateMock = vi.fn()
  const mutateAsyncMock = vi.fn()

  const mockFloatingIp: FloatingIp = {
    id: "fip-123",
    floating_ip_address: "203.0.113.10",
    fixed_ip_address: "10.0.0.5",
    floating_network_id: "net-external",
    port_id: "port-1",
    router_id: "router-1",
    project_id: "proj-1",
    tenant_id: "proj-1",
    status: "ACTIVE",
    dns_domain: "example.com",
    dns_name: "fip-1",
    description: "Web server FIP",
    revision_number: 1,
    tags: [],
  }

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  beforeEach(() => {
    i18n.activate("en")

    mockUseUtils.mockReturnValue({
      network: {
        floatingIp: {
          list: {
            invalidate: listInvalidateMock,
          },
          getById: {
            invalidate: getByIdInvalidateMock,
          },
        },
      },
    })

    mockUpdateMutation.mockImplementation((options?: { onSuccess?: () => void }) => {
      mutateAsyncMock.mockImplementation(async () => {
        await options?.onSuccess?.()
      })

      return {
        mutateAsync: mutateAsyncMock,
        isPending: false,
        error: null,
      }
    })
  })

  describe("Rendering", () => {
    it("renders floating IP data in cells", async () => {
      const router = createTestRouter(<FloatingIpTableRow floatingIp={mockFloatingIp} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("203.0.113.10")).toBeInTheDocument()
      })

      expect(screen.getByText("10.0.0.5")).toBeInTheDocument()
      expect(screen.getByText("net-external")).toBeInTheDocument()
      expect(screen.getByText("Web server FIP")).toBeInTheDocument()
    })

    it("renders status icon and text in single cell", async () => {
      const router = createTestRouter(<FloatingIpTableRow floatingIp={mockFloatingIp} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument()
      })

      // Verify the row contains the status text
      const row = screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)
      expect(row.textContent).toContain("Active")
    })

    it("renders em dash when fixed IP is missing", async () => {
      const fipWithoutFixedIp = { ...mockFloatingIp, fixed_ip_address: null }
      const router = createTestRouter(<FloatingIpTableRow floatingIp={fipWithoutFixedIp} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        const cells = screen.getAllByText("—")
        expect(cells.length).toBeGreaterThan(0)
      })
    })

    it("renders em dash when description is missing", async () => {
      const fipWithoutDescription = { ...mockFloatingIp, description: null }
      const router = createTestRouter(<FloatingIpTableRow floatingIp={fipWithoutDescription} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        const cells = screen.getAllByText("—")
        expect(cells.length).toBeGreaterThan(0)
      })
    })

    it("renders correct data-testid", async () => {
      const router = createTestRouter(<FloatingIpTableRow floatingIp={mockFloatingIp} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)).toBeInTheDocument()
      })
    })

    it("renders different status values correctly", async () => {
      const testCases: Array<[typeof mockFloatingIp.status, string]> = [
        ["ACTIVE", "Active"],
        ["DOWN", "Down"],
        ["ERROR", "Error"],
      ]

      for (const [status, displayText] of testCases) {
        const { unmount } = render(
          <RouterProvider
            router={createTestRouter(<FloatingIpTableRow floatingIp={{ ...mockFloatingIp, status }} />)}
          />
        )

        await waitFor(() => {
          expect(screen.getByText(displayText)).toBeInTheDocument()
        })

        unmount()
      }
    })
  })

  describe("Navigation", () => {
    it("navigates to details page when Preview is clicked", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(<FloatingIpTableRow floatingIp={mockFloatingIp} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("203.0.113.10")).toBeInTheDocument()
      })

      // Open the popup menu and click Preview
      const row = screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)
      const menuButton = row.querySelector("button")
      expect(menuButton).toBeInTheDocument()

      await user.click(menuButton!)

      await waitFor(() => {
        const previewItem = screen.getByText("Preview")
        expect(previewItem).toBeInTheDocument()
      })

      const previewItem = screen.getByText("Preview")
      await user.click(previewItem)

      // Verify navigation occurred (the router should update the location)
      await waitFor(() => {
        expect(router.state.location.pathname).toContain("floatingips/fip-123")
      })
    })

    it("renders menu items with correct labels", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(<FloatingIpTableRow floatingIp={mockFloatingIp} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("203.0.113.10")).toBeInTheDocument()
      })

      // Open the popup menu
      const row = screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)
      const menuButton = row.querySelector("button")
      expect(menuButton).toBeInTheDocument()

      await user.click(menuButton!)

      await waitFor(() => {
        expect(screen.getByText("Preview")).toBeInTheDocument()
        expect(screen.getByText("Edit Description")).toBeInTheDocument()
        expect(screen.getByText("Attach")).toBeInTheDocument()
        expect(screen.getByText("Detach")).toBeInTheDocument()
        expect(screen.getByText("Release")).toBeInTheDocument()
      })
    })
  })

  describe("Edit modal", () => {
    it("opens and closes edit modal from menu action", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(<FloatingIpTableRow floatingIp={mockFloatingIp} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("203.0.113.10")).toBeInTheDocument()
      })

      const row = screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)
      const menuButton = row.querySelector("button")
      expect(menuButton).toBeInTheDocument()

      await user.click(menuButton!)
      await user.click(screen.getByText("Edit Description"))

      expect(screen.getByTestId("edit-floating-ip-modal")).toBeInTheDocument()

      await user.click(screen.getByText("Close Edit Modal"))

      await waitFor(() => {
        expect(screen.queryByTestId("edit-floating-ip-modal")).not.toBeInTheDocument()
      })
    })

    it("submits update and invalidates floating IP queries", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(<FloatingIpTableRow floatingIp={mockFloatingIp} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)).toBeInTheDocument()
      })

      const row = screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)
      const menuButton = row.querySelector("button")
      expect(menuButton).toBeInTheDocument()

      await user.click(menuButton!)
      await user.click(screen.getByText("Edit Description"))
      await user.click(screen.getByText("Save Edit"))

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          floatingip_id: mockFloatingIp.id,
          port_id: mockFloatingIp.port_id,
          description: "Updated description",
        })
      })

      await waitFor(() => {
        expect(listInvalidateMock).toHaveBeenCalled()
        expect(getByIdInvalidateMock).toHaveBeenCalledWith({ floatingip_id: mockFloatingIp.id })
      })
    })

    it("passes mutation loading and error state to edit modal", async () => {
      mockUpdateMutation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        error: { message: "Update failed" },
      })

      const user = userEvent.setup()
      const router = createTestRouter(<FloatingIpTableRow floatingIp={mockFloatingIp} />)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)).toBeInTheDocument()
      })

      const row = screen.getByTestId(`floating-ip-row-${mockFloatingIp.id}`)
      const menuButton = row.querySelector("button")
      expect(menuButton).toBeInTheDocument()

      await user.click(menuButton!)
      await user.click(screen.getByText("Edit Description"))

      expect(screen.getByTestId("edit-modal-loading")).toHaveTextContent("loading")
      expect(screen.getByTestId("edit-modal-error")).toHaveTextContent("Update failed")
    })
  })
})
