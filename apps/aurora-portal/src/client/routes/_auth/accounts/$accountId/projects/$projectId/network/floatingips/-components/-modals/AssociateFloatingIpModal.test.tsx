import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import type { AvailablePort } from "@/server/Network/types/port"
import { trpcReact } from "@/client/trpcClient"
import { AssociateFloatingIpModal, AssociateFloatingIpModalProps } from "./AssociateFloatingIpModal"

vi.mock("@tanstack/react-router", () => ({
  useParams: vi.fn(() => ({ projectId: "test-project" })),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    network: {
      port: {
        listAvailablePorts: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}))

const mockPorts: AvailablePort[] = [
  {
    id: "port-1",
    name: "web-port",
    fixed_ips: [{ ip_address: "10.0.0.5", subnet_id: "subnet-1" }],
  },
  {
    id: "port-2",
    name: "db-port",
    fixed_ips: [
      { ip_address: "10.0.0.6", subnet_id: "subnet-1" },
      { ip_address: "10.0.0.7", subnet_id: "subnet-1" },
    ],
  },
  {
    id: "port-3",
    name: null,
    fixed_ips: [],
  },
]

const mockFloatingIp: FloatingIp = {
  id: "fip-123",
  floating_ip_address: "203.0.113.10",
  fixed_ip_address: "10.0.0.5",
  floating_network_id: "net-external",
  port_id: null,
  router_id: "router-1",
  project_id: "proj-1",
  tenant_id: "proj-1",
  status: "ACTIVE",
  dns_domain: "example.com",
  dns_name: "fip-1",
  description: "Test floating IP",
  revision_number: 1,
  tags: [],
}

type AssociateFloatingIpModalRenderOptions = Partial<AssociateFloatingIpModalProps>

const renderModal = ({
  floatingIp = mockFloatingIp,
  open = true,
  onClose = vi.fn(),
  onUpdate = vi.fn().mockResolvedValue(undefined),
  isLoading = false,
  error = null,
}: AssociateFloatingIpModalRenderOptions = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <AssociateFloatingIpModal
          floatingIp={floatingIp}
          open={open}
          onClose={onClose}
          onUpdate={onUpdate}
          isLoading={isLoading}
          error={error}
        />
      </PortalProvider>
    </I18nProvider>
  )

describe("AssociateFloatingIpModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
    vi.mocked(trpcReact.network.port.listAvailablePorts.useQuery).mockReturnValue({
      data: mockPorts,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof trpcReact.network.port.listAvailablePorts.useQuery>)
  })

  test("renders title, port select and fixed IP select", () => {
    renderModal()

    expect(screen.getByText("Associate Floating IP 203.0.113.10 with Port")).toBeInTheDocument()
    expect(screen.getByLabelText("Port ID")).toBeInTheDocument()
    expect(screen.getByLabelText("Fixed IP Address")).toBeInTheDocument()
  })

  test("does not render when open is false", () => {
    renderModal({ open: false })

    expect(screen.queryByText("Associate Floating IP 203.0.113.10 with Port")).not.toBeInTheDocument()
  })

  test("port select shows available ports from query", () => {
    renderModal()

    expect(screen.getByText("web-port (port-1)")).toBeInTheDocument()
    expect(screen.getByText("db-port (port-2)")).toBeInTheDocument()
    // port-3 has no name, shows id only
    expect(screen.getByText("port-3")).toBeInTheDocument()
  })

  test("associate button is disabled until a port is selected", async () => {
    const user = userEvent.setup()
    renderModal()

    const associateBtn = screen.getByRole("button", { name: "Associate" })
    expect(associateBtn).toBeDisabled()

    await user.click(screen.getByText("web-port (port-1)"))
    expect(associateBtn).toBeEnabled()
  })

  test("selecting a port with single IP auto-populates fixed IP and submits", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal({ onUpdate, onClose })

    await user.click(screen.getByText("web-port (port-1)"))
    await user.click(screen.getByRole("button", { name: "Associate" }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("fip-123", {
        port_id: "port-1",
        fixed_ip_address: "10.0.0.5",
      })
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test("selecting a port with multiple IPs and no fixed IP selected omits fixed_ip_address", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderModal({ onUpdate })

    await user.click(screen.getByText("db-port (port-2)"))
    await user.click(screen.getByRole("button", { name: "Associate" }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("fip-123", {
        port_id: "port-2",
      })
    })
  })

  test("selecting a port with multiple IPs allows manual fixed IP selection", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderModal({ onUpdate })

    await user.click(screen.getByText("db-port (port-2)"))

    // Both IPs should be available in the fixed IP select
    expect(screen.getByText("10.0.0.6")).toBeInTheDocument()
    expect(screen.getByText("10.0.0.7")).toBeInTheDocument()

    await user.click(screen.getByText("10.0.0.7"))
    await user.click(screen.getByRole("button", { name: "Associate" }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("fip-123", {
        port_id: "port-2",
        fixed_ip_address: "10.0.0.7",
      })
    })
  })

  test("fixed IP select is disabled when no port is selected", () => {
    renderModal()

    const fixedIpSelect = screen.getByLabelText("Fixed IP Address")
    expect(fixedIpSelect).toBeDisabled()
  })

  test("fixed IP select is disabled when selected port has no fixed IPs", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByText("port-3"))

    const fixedIpSelect = screen.getByLabelText("Fixed IP Address")
    expect(fixedIpSelect).toBeDisabled()
  })

  test("shows loading state and disables associate button", () => {
    renderModal({ isLoading: true })

    expect(screen.getByText("Associating Floating IP...")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Associate" })).toBeDisabled()
    expect(screen.queryByLabelText("Port ID")).not.toBeInTheDocument()
  })

  test("renders API error message when provided", () => {
    renderModal({ error: "Association failed" })

    expect(screen.getByText("Association failed")).toBeInTheDocument()
  })

  test("calls onClose when cancel is clicked", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal({ onClose })

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test("shows port loading state while fetching ports", () => {
    vi.mocked(trpcReact.network.port.listAvailablePorts.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof trpcReact.network.port.listAvailablePorts.useQuery>)

    renderModal()

    // Port select renders but with no options
    expect(screen.getByLabelText("Port ID")).toBeInTheDocument()
  })
})
