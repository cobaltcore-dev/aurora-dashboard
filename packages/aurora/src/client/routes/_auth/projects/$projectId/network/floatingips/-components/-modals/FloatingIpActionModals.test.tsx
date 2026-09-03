import type { ReactNode } from "react"
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider, NotificationManager } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { FloatingIpActionModals } from "./FloatingIpActionModals"
import { EditFloatingIpModalProps } from "./EditFloatingIpModal"
import { DetachFloatingIpModalProps } from "./DetachFloatingIpModal"
import { ReleaseFloatingIpModalProps } from "./ReleaseFloatingIpModal"
import { AssociateFloatingIpModalProps } from "./AssociateFloatingIpModal"

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    useParams: vi.fn(() => ({ projectId: "test-project" })),
    useNavigate: vi.fn(() => mockNavigate),
  }
})

const { mockUseUtils, mockUpdateMutation, mockDeleteMutation } = vi.hoisted(() => ({
  mockUseUtils: vi.fn(),
  mockUpdateMutation: vi.fn(),
  mockDeleteMutation: vi.fn(),
}))

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      useUtils: mockUseUtils,
      network: {
        floatingIp: {
          update: {
            useMutation: mockUpdateMutation,
          },
          delete: {
            useMutation: mockDeleteMutation,
          },
        },
      },
    },
  }
})

vi.mock("./EditFloatingIpModal", () => ({
  EditFloatingIpModal: ({ open, onClose, onUpdate, floatingIp, isLoading, error }: EditFloatingIpModalProps) =>
    open ? (
      <div data-testid="edit-floating-ip-modal">
        <span data-testid="edit-modal-loading">{isLoading ? "loading" : "idle"}</span>
        <span data-testid="edit-modal-error">{error ?? ""}</span>
        <button onClick={onClose}>Close Edit Modal</button>
        <button
          onClick={() =>
            onUpdate(floatingIp.id, {
              project_id: "test-project",
              port_id: floatingIp.port_id ?? null,
              description: "Updated description",
            })
          }
        >
          Save Edit
        </button>
      </div>
    ) : null,
}))

vi.mock("./ReleaseFloatingIpModal", () => ({
  ReleaseFloatingIpModal: ({ open, onClose, onUpdate, floatingIp, isLoading, error }: ReleaseFloatingIpModalProps) =>
    open ? (
      <div data-testid="release-floating-ip-modal">
        <span data-testid="release-modal-loading">{isLoading ? "loading" : "idle"}</span>
        <span data-testid="release-modal-error">{error ?? ""}</span>
        <button onClick={onClose}>Close Release Modal</button>
        <button onClick={() => onUpdate(floatingIp.id)}>Confirm Release</button>
      </div>
    ) : null,
}))

vi.mock("./DetachFloatingIpModal", () => ({
  DetachFloatingIpModal: ({ open, onClose, onUpdate, floatingIp, isLoading, error }: DetachFloatingIpModalProps) =>
    open ? (
      <div data-testid="detach-floating-ip-modal">
        <span data-testid="detach-modal-loading">{isLoading ? "loading" : "idle"}</span>
        <span data-testid="detach-modal-error">{error ?? ""}</span>
        <button onClick={onClose}>Close Detach Modal</button>
        <button onClick={() => onUpdate(floatingIp.id, { project_id: "test-project", port_id: null })}>
          Confirm Detach
        </button>
      </div>
    ) : null,
}))

vi.mock("./AssociateFloatingIpModal", () => ({
  AssociateFloatingIpModal: ({
    open,
    onClose,
    onUpdate,
    floatingIp,
    isLoading,
    error,
  }: AssociateFloatingIpModalProps) =>
    open ? (
      <div data-testid="associate-floating-ip-modal">
        <span data-testid="associate-modal-loading">{isLoading ? "loading" : "idle"}</span>
        <span data-testid="associate-modal-error">{error ?? ""}</span>
        <button onClick={onClose}>Close Associate Modal</button>
        <button onClick={() => onUpdate(floatingIp.id, { project_id: "test-project", port_id: "port-new" })}>
          Confirm Associate
        </button>
      </div>
    ) : null,
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>
      <NotificationManager />
      {children}
    </PortalProvider>
  </I18nProvider>
)

const renderWithTriggers = (floatingIp: FloatingIp) =>
  render(
    <TestWrapper>
      <FloatingIpActionModals floatingIp={floatingIp}>
        {({ toggleEditModal, toggleAttachModal, toggleDetachModal, toggleReleaseModal }) => (
          <>
            <button onClick={toggleEditModal}>Open Edit</button>
            <button onClick={toggleAttachModal}>Open Attach</button>
            <button onClick={toggleDetachModal}>Open Detach</button>
            <button onClick={toggleReleaseModal}>Open Release</button>
          </>
        )}
      </FloatingIpActionModals>
    </TestWrapper>
  )

describe("FloatingIpActionModals", () => {
  const listInvalidateMock = vi.fn()
  const getByIdInvalidateMock = vi.fn()
  const mutateAsyncMock = vi.fn()
  const deleteAsyncMock = vi.fn()

  beforeAll(() => {
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn()
    if (!window.matchMedia) {
      window.matchMedia = (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    }
  })

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
            cancel: vi.fn().mockResolvedValue(undefined),
          },
          getById: {
            invalidate: getByIdInvalidateMock,
            cancel: vi.fn().mockResolvedValue(undefined),
            getData: vi.fn().mockReturnValue(undefined),
            setData: vi.fn(),
          },
        },
      },
    })

    mockUpdateMutation.mockImplementation(
      (options?: { onSettled?: (data: unknown, error: unknown, variables: unknown) => void }) => {
        mutateAsyncMock.mockImplementation(async (variables: unknown) => {
          await options?.onSettled?.(undefined, null, variables)
        })

        return {
          mutateAsync: mutateAsyncMock,
          isPending: false,
          error: null,
        }
      }
    )

    mockDeleteMutation.mockImplementation(
      (options?: { onSettled?: (data: unknown, error: unknown, variables: { floatingip_id: string }) => void }) => {
        deleteAsyncMock.mockImplementation(async (variables: { floatingip_id: string }) => {
          await options?.onSettled?.(undefined, null, variables)
        })

        return {
          mutateAsync: deleteAsyncMock,
          isPending: false,
          error: null,
        }
      }
    )
  })

  describe("Edit modal", () => {
    it("opens and closes edit modal", async () => {
      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Edit" }))
      expect(screen.getByTestId("edit-floating-ip-modal")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Close Edit Modal" }))

      await waitFor(() => {
        expect(screen.queryByTestId("edit-floating-ip-modal")).not.toBeInTheDocument()
      })
    })

    it("passes loading and error mutation state to edit modal", async () => {
      mockUpdateMutation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        error: { message: "Update failed" },
      })

      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Edit" }))

      expect(screen.getByTestId("edit-modal-loading")).toHaveTextContent("loading")
      expect(screen.getByTestId("edit-modal-error")).toHaveTextContent("Update failed")
    })
  })

  describe("Detach modal", () => {
    it("opens and closes detach modal", async () => {
      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Detach" }))
      expect(screen.getByTestId("detach-floating-ip-modal")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Close Detach Modal" }))

      await waitFor(() => {
        expect(screen.queryByTestId("detach-floating-ip-modal")).not.toBeInTheDocument()
      })
    })

    it("passes loading and error mutation state to detach modal", async () => {
      mockUpdateMutation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        error: { message: "Detach failed" },
      })

      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Detach" }))

      expect(screen.getByTestId("detach-modal-loading")).toHaveTextContent("loading")
      expect(screen.getByTestId("detach-modal-error")).toHaveTextContent("Detach failed")
    })
  })

  describe("Attach modal", () => {
    it("opens and closes attach modal", async () => {
      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Attach" }))
      expect(screen.getByTestId("associate-floating-ip-modal")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Close Associate Modal" }))

      await waitFor(() => {
        expect(screen.queryByTestId("associate-floating-ip-modal")).not.toBeInTheDocument()
      })
    })

    it("passes loading and error mutation state to attach modal", async () => {
      mockUpdateMutation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        error: { message: "Attach failed" },
      })

      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Attach" }))

      expect(screen.getByTestId("associate-modal-loading")).toHaveTextContent("loading")
      expect(screen.getByTestId("associate-modal-error")).toHaveTextContent("Attach failed")
    })
  })

  describe("Release modal", () => {
    it("opens and closes release modal", async () => {
      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Release" }))
      expect(screen.getByTestId("release-floating-ip-modal")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Close Release Modal" }))

      await waitFor(() => {
        expect(screen.queryByTestId("release-floating-ip-modal")).not.toBeInTheDocument()
      })
    })

    it("passes loading and error mutation state to release modal", async () => {
      mockDeleteMutation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        error: { message: "Release failed" },
      })

      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Release" }))

      expect(screen.getByTestId("release-modal-loading")).toHaveTextContent("loading")
      expect(screen.getByTestId("release-modal-error")).toHaveTextContent("Release failed")
    })
  })

  describe("toast notifications", () => {
    it("shows a success toast after a successful edit", async () => {
      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Edit" }))
      await user.click(screen.getByRole("button", { name: "Save Edit" }))

      expect(await screen.findByText("Floating IP Updated")).toBeInTheDocument()
    })

    it("shows a success toast after a successful associate", async () => {
      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Attach" }))
      await user.click(screen.getByRole("button", { name: "Confirm Associate" }))

      expect(await screen.findByText("Floating IP Associated")).toBeInTheDocument()
    })

    it("shows a success toast after a successful detach", async () => {
      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Detach" }))
      await user.click(screen.getByRole("button", { name: "Confirm Detach" }))

      expect(await screen.findByText("Floating IP Detached")).toBeInTheDocument()
    })

    it("shows a success toast after a successful release", async () => {
      const user = userEvent.setup()
      renderWithTriggers(mockFloatingIp)

      await user.click(screen.getByRole("button", { name: "Open Release" }))
      await user.click(screen.getByRole("button", { name: "Confirm Release" }))

      expect(await screen.findByText("Floating IP Released")).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/network/floatingips",
        params: { projectId: "test-project" },
      })
    })
  })
})
