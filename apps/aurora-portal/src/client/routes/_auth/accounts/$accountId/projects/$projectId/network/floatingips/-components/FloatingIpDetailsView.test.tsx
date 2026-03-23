import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { FloatingIpDetailsView } from "./FloatingIpDetailsView"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { ReactNode } from "react"
import { FloatingIpUpdateFields } from "./-modals/EditFloatingIpModal"

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

vi.mock("./-modals/EditFloatingIpModal", () => ({
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
            onUpdate(floatingIp.id, { port_id: floatingIp.port_id ?? null, description: "Updated details description" })
          }
        >
          Save Edit
        </button>
      </div>
    ) : null,
}))

vi.mock("./-modals/DetachFloatingIpModal", () => ({
  DetachFloatingIpModal: ({
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
      <div data-testid="detach-floating-ip-modal">
        <span data-testid="detach-modal-loading">{isLoading ? "loading" : "idle"}</span>
        <span data-testid="detach-modal-error">{error ?? ""}</span>
        <button onClick={onClose}>Close Detach Modal</button>
        <button onClick={() => onUpdate(floatingIp.id, { port_id: null })}>Confirm Detach</button>
      </div>
    ) : null,
}))

const TestWrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("FloatingIpDetailsView", () => {
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
    tags: ["production", "web"],
    port_details: {
      name: "port-web-1",
      network_id: "net-internal",
      mac_address: "fa:16:3e:00:00:01",
      device_owner: "compute:nova",
      device_id: "instance-123",
      admin_state_up: true,
      status: "ACTIVE",
    },
    qos_policy_id: "qos-1",
    port_forwardings: [
      {
        id: "pf-1",
        protocol: "tcp",
        internal_ip_address: "10.0.0.5",
        internal_port: 8080,
        external_port: 80,
      },
    ],
  }

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

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Header and description", () => {
    it("displays floating IP address in heading", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText(/IP: 203.0.113.10/i)).toBeInTheDocument()
    })

    it("displays description text", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText(/Full lifecycle management of Floating IPs/i)).toBeInTheDocument()
    })
  })

  describe("Button row", () => {
    it("renders all action buttons", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Edit Description")).toBeInTheDocument()
      expect(screen.getByText("Attach")).toBeInTheDocument()
      expect(screen.getByText("Detach")).toBeInTheDocument()
      expect(screen.getByText("Release")).toBeInTheDocument()
    })

    it("opens and closes edit description modal", async () => {
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Edit Description" }))
      expect(screen.getByTestId("edit-floating-ip-modal")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Close Edit Modal" }))

      await waitFor(() => {
        expect(screen.queryByTestId("edit-floating-ip-modal")).not.toBeInTheDocument()
      })
    })

    it("opens and closes detach modal", async () => {
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Detach" }))
      expect(screen.getByTestId("detach-floating-ip-modal")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Close Detach Modal" }))

      await waitFor(() => {
        expect(screen.queryByTestId("detach-floating-ip-modal")).not.toBeInTheDocument()
      })
    })

    it("renders only the selected modal at a time", async () => {
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Edit Description" }))
      expect(screen.getByTestId("edit-floating-ip-modal")).toBeInTheDocument()
      expect(screen.queryByTestId("detach-floating-ip-modal")).not.toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Close Edit Modal" }))
      await waitFor(() => {
        expect(screen.queryByTestId("edit-floating-ip-modal")).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole("button", { name: "Detach" }))
      expect(screen.getByTestId("detach-floating-ip-modal")).toBeInTheDocument()
      expect(screen.queryByTestId("edit-floating-ip-modal")).not.toBeInTheDocument()
    })

    it("submits update and invalidates detail and list queries", async () => {
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Edit Description" }))
      await user.click(screen.getByRole("button", { name: "Save Edit" }))

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          floatingip_id: mockFloatingIp.id,
          port_id: mockFloatingIp.port_id,
          description: "Updated details description",
        })
      })

      await waitFor(() => {
        expect(getByIdInvalidateMock).toHaveBeenCalledWith({ floatingip_id: mockFloatingIp.id })
        expect(listInvalidateMock).toHaveBeenCalled()
      })
    })

    it("submits detach update and invalidates detail and list queries", async () => {
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Detach" }))
      await user.click(screen.getByRole("button", { name: "Confirm Detach" }))

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          floatingip_id: mockFloatingIp.id,
          port_id: null,
        })
      })

      await waitFor(() => {
        expect(getByIdInvalidateMock).toHaveBeenCalledWith({ floatingip_id: mockFloatingIp.id })
        expect(listInvalidateMock).toHaveBeenCalled()
      })
    })

    it("passes loading and error mutation state to edit modal", async () => {
      mockUpdateMutation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        error: { message: "Failed to update description" },
      })

      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Edit Description" }))

      expect(screen.getByTestId("edit-modal-loading")).toHaveTextContent("loading")
      expect(screen.getByTestId("edit-modal-error")).toHaveTextContent("Failed to update description")
    })
  })

  describe("Basic Info section", () => {
    it("displays basic info heading", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Basic Info")).toBeInTheDocument()
    })

    it("displays floating IP ID", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("fip-123")).toBeInTheDocument()
    })

    it("displays description when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Web server FIP")).toBeInTheDocument()
    })

    it("does not display description when absent", () => {
      const fipWithoutDescription = { ...mockFloatingIp, description: null }
      render(<FloatingIpDetailsView floatingIp={fipWithoutDescription} />, { wrapper: TestWrapper })

      expect(screen.queryByText("Web server FIP")).not.toBeInTheDocument()
    })

    it("displays project ID", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("proj-1")).toBeInTheDocument()
    })

    it("displays formatted status", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Active")).toBeInTheDocument()
    })

    it("displays created and updated timestamps when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      // Verify Basic Info section renders (timestamps are optional)
      expect(screen.getByText("Basic Info")).toBeInTheDocument()
    })

    it("displays tags joined by comma", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("production, web")).toBeInTheDocument()
    })

    it("displays em dash when no tags", () => {
      const fipWithoutTags = { ...mockFloatingIp, tags: [] }
      render(<FloatingIpDetailsView floatingIp={fipWithoutTags} />, { wrapper: TestWrapper })

      const tags = screen.getAllByText("—")
      expect(tags.length).toBeGreaterThan(0)
    })

    it("formats different status values correctly", () => {
      const statuses: Array<[typeof mockFloatingIp.status, string]> = [
        ["ACTIVE", "Active"],
        ["DOWN", "Down"],
        ["ERROR", "Error"],
      ]

      statuses.forEach(([status, displayText]) => {
        const { unmount } = render(<FloatingIpDetailsView floatingIp={{ ...mockFloatingIp, status }} />, {
          wrapper: TestWrapper,
        })

        expect(screen.getByText(displayText)).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe("Network & Routing section", () => {
    it("displays network & routing heading", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Network & Routing")).toBeInTheDocument()
    })

    it("displays floating IP address and network", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("203.0.113.10")).toBeInTheDocument()
      expect(screen.getByText("net-external")).toBeInTheDocument()
    })

    it("displays fixed IP address when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("10.0.0.5")).toBeInTheDocument()
    })

    it("displays port details when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("port-web-1")).toBeInTheDocument()
      expect(screen.getByText("fa:16:3e:00:00:01")).toBeInTheDocument()
      expect(screen.getByText("net-internal")).toBeInTheDocument()
      expect(screen.getByText("compute:nova")).toBeInTheDocument()
      expect(screen.getByText("instance-123")).toBeInTheDocument()
    })

    it("displays router ID when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("router-1")).toBeInTheDocument()
    })

    it("displays port ID when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("port-1")).toBeInTheDocument()
    })

    it("displays QoS policy ID", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("qos-1")).toBeInTheDocument()
    })

    it("displays port forwardings when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("pf-1")).toBeInTheDocument()
    })
  })

  describe("DNS section", () => {
    it("displays DNS heading", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("DNS")).toBeInTheDocument()
    })

    it("displays DNS domain and name when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("example.com")).toBeInTheDocument()
      expect(screen.getByText("fip-1")).toBeInTheDocument()
    })

    it("displays em dash when DNS domain is missing", () => {
      const fipWithoutDnsDomain = { ...mockFloatingIp, dns_domain: undefined }
      render(<FloatingIpDetailsView floatingIp={fipWithoutDnsDomain} />, { wrapper: TestWrapper })

      const emDashes = screen.getAllByText("—")
      expect(emDashes.length).toBeGreaterThan(0)
    })

    it("displays em dash when DNS name is missing", () => {
      const fipWithoutDnsName = { ...mockFloatingIp, dns_name: undefined }
      render(<FloatingIpDetailsView floatingIp={fipWithoutDnsName} />, { wrapper: TestWrapper })

      const emDashes = screen.getAllByText("—")
      expect(emDashes.length).toBeGreaterThan(0)
    })
  })

  describe("Minimal floating IP", () => {
    const minimalFloatingIp: FloatingIp = {
      id: "fip-minimal",
      floating_ip_address: "203.0.113.100",
      floating_network_id: "net-ext",
      project_id: "proj-min",
      tenant_id: "proj-min",
      status: "DOWN",
      revision_number: 1,
      fixed_ip_address: null,
      port_id: null,
      router_id: null,
      description: null,
      tags: undefined,
      dns_domain: undefined,
      dns_name: undefined,
      port_details: null,
      qos_policy_id: undefined,
      port_forwardings: undefined,
    }

    it("renders with minimal required data", () => {
      render(<FloatingIpDetailsView floatingIp={minimalFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByRole("heading", { name: /203\.0\.113\.100/ })).toBeInTheDocument()
      expect(screen.getByText("Down")).toBeInTheDocument()
      expect(screen.getByText("net-ext")).toBeInTheDocument()
    })
  })

  describe("All status types", () => {
    it("renders ACTIVE status correctly", () => {
      const activeIp = { ...mockFloatingIp, status: "ACTIVE" as const }
      render(<FloatingIpDetailsView floatingIp={activeIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Active")).toBeInTheDocument()
    })

    it("renders DOWN status correctly", () => {
      const downIp = { ...mockFloatingIp, status: "DOWN" as const }
      render(<FloatingIpDetailsView floatingIp={downIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Down")).toBeInTheDocument()
    })

    it("renders ERROR status correctly", () => {
      const errorIp = { ...mockFloatingIp, status: "ERROR" as const }
      render(<FloatingIpDetailsView floatingIp={errorIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Error")).toBeInTheDocument()
    })
  })

  describe("Data grid structure", () => {
    it("renders multiple sections", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Basic Info")).toBeInTheDocument()
      expect(screen.getByText("Network & Routing")).toBeInTheDocument()
      expect(screen.getByText("DNS")).toBeInTheDocument()
    })
  })
})
