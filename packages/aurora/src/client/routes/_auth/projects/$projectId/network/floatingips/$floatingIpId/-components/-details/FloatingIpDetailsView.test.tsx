import { ReactElement, ReactNode } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpDetailsView } from "./FloatingIpDetailsView"
import { FloatingIpActionModalTriggers } from "../../../-components/-modals/FloatingIpActionModals"

vi.mock("@/client/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/hooks")>()
  return {
    ...actual,
    useProjectId: vi.fn(() => "proj-1"),
  }
})

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      network: {
        canUser: {
          useQuery: vi.fn(),
        },
      },
    },
  }
})

vi.mock("../../../-components/-modals/FloatingIpActionModals", () => ({
  FloatingIpActionModals: ({ children }: { children: (triggers: FloatingIpActionModalTriggers) => ReactElement }) =>
    children({
      toggleEditModal: vi.fn(),
      toggleAttachModal: vi.fn(),
      toggleDetachModal: vi.fn(),
      toggleReleaseModal: vi.fn(),
    }),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

describe("FloatingIpDetailsView", () => {
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
    created_at: "2025-01-01T10:30:00.000Z" as FloatingIp["created_at"],
    updated_at: "2025-01-02T12:45:00.000Z" as FloatingIp["updated_at"],
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
    // Default: user is allowed to perform every action. Individual tests override this to assert gating.
    vi.mocked(trpcReact.network.canUser.useQuery).mockReturnValue({
      data: { canUpdate: true, canDisassociate: true, canDelete: true, canAssociate: true },
    } as ReturnType<typeof trpcReact.network.canUser.useQuery>)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Header", () => {
    it("displays floating IP address in the network section", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getAllByText("203.0.113.10").length).toBeGreaterThan(0)
    })
  })

  describe("Header actions", () => {
    it("renders Attach as the primary action", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Attach")).toBeInTheDocument()
    })

    it("renders the remaining actions in the kebab menu", async () => {
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Floating IP actions" }))

      expect(screen.getByText("Edit Description")).toBeInTheDocument()
      expect(screen.getByText("Detach")).toBeInTheDocument()
      expect(screen.getByText("Release")).toBeInTheDocument()
    })

    it("disables Edit Description when the user lacks update permission", async () => {
      vi.mocked(trpcReact.network.canUser.useQuery).mockReturnValue({
        data: { canUpdate: false, canDisassociate: true, canDelete: true, canAssociate: true },
      } as ReturnType<typeof trpcReact.network.canUser.useQuery>)
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Floating IP actions" }))

      expect(screen.getByRole("menuitem", { name: "Edit Description" })).toHaveAttribute("aria-disabled", "true")
    })

    it("disables Detach when the user lacks disassociate permission", async () => {
      vi.mocked(trpcReact.network.canUser.useQuery).mockReturnValue({
        data: { canUpdate: true, canDisassociate: false, canDelete: true, canAssociate: true },
      } as ReturnType<typeof trpcReact.network.canUser.useQuery>)
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Floating IP actions" }))

      expect(screen.getByRole("menuitem", { name: "Detach" })).toHaveAttribute("aria-disabled", "true")
    })

    it("disables Release when the user lacks delete permission", async () => {
      vi.mocked(trpcReact.network.canUser.useQuery).mockReturnValue({
        data: { canUpdate: true, canDisassociate: true, canDelete: false, canAssociate: true },
      } as ReturnType<typeof trpcReact.network.canUser.useQuery>)
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      await user.click(screen.getByRole("button", { name: "Floating IP actions" }))

      expect(screen.getByRole("menuitem", { name: "Release" })).toHaveAttribute("aria-disabled", "true")
    })

    it("hides Attach when the user lacks associate permission", () => {
      vi.mocked(trpcReact.network.canUser.useQuery).mockReturnValue({
        data: { canUpdate: true, canDisassociate: true, canDelete: true, canAssociate: false },
      } as ReturnType<typeof trpcReact.network.canUser.useQuery>)
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.queryByText("Attach")).not.toBeInTheDocument()
    })

    it("keeps the kebab menu available but disables every option for a viewer", async () => {
      vi.mocked(trpcReact.network.canUser.useQuery).mockReturnValue({
        data: { canUpdate: false, canDisassociate: false, canDelete: false, canAssociate: false },
      } as ReturnType<typeof trpcReact.network.canUser.useQuery>)
      const user = userEvent.setup()
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      const menuButton = screen.getByRole("button", { name: "Floating IP actions" })
      expect(menuButton).toBeInTheDocument()

      await user.click(menuButton)

      expect(screen.getByRole("menuitem", { name: "Edit Description" })).toHaveAttribute("aria-disabled", "true")
      expect(screen.getByRole("menuitem", { name: "Detach" })).toHaveAttribute("aria-disabled", "true")
      expect(screen.getByRole("menuitem", { name: "Release" })).toHaveAttribute("aria-disabled", "true")
      expect(screen.queryByText("Attach")).not.toBeInTheDocument()
    })
  })

  describe("Basic Info section", () => {
    it("displays basic info heading", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByRole("heading", { level: 2, name: "Basic Info" })).toBeInTheDocument()
    })

    it("displays floating IP ID", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("fip-123")).toBeInTheDocument()
    })

    it("displays description when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Web server FIP")).toBeInTheDocument()
    })

    it("displays empty state placeholder for description when absent", () => {
      const fipWithoutDescription = { ...mockFloatingIp, description: null }
      render(<FloatingIpDetailsView floatingIp={fipWithoutDescription} />, { wrapper: TestWrapper })

      expect(screen.getByText("Description")).toBeInTheDocument()
      expect(screen.getByText("- -")).toBeInTheDocument()
      expect(screen.queryByText("Web server FIP")).not.toBeInTheDocument()
    })

    it("displays project ID", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getAllByText("proj-1").length).toBeGreaterThan(0)
    })

    it("displays formatted status", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Active")).toBeInTheDocument()
    })

    it("displays created and updated timestamps when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText(new Date(mockFloatingIp.created_at!).toLocaleString())).toBeInTheDocument()
      expect(screen.getByText(new Date(mockFloatingIp.updated_at!).toLocaleString())).toBeInTheDocument()
    })

    it("displays tags joined by comma", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("production, web")).toBeInTheDocument()
    })

    it("displays empty state placeholder when no tags", () => {
      const fipWithoutTags = { ...mockFloatingIp, tags: [] }
      render(<FloatingIpDetailsView floatingIp={fipWithoutTags} />, { wrapper: TestWrapper })

      const tags = screen.getAllByText("- -")
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

      expect(screen.getByRole("heading", { level: 2, name: "Network & Routing" })).toBeInTheDocument()
    })

    it("displays floating IP address and network", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getAllByText("203.0.113.10").length).toBeGreaterThan(0)
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

      expect(screen.getByRole("heading", { level: 2, name: "DNS" })).toBeInTheDocument()
    })

    it("displays DNS domain and name when present", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("example.com")).toBeInTheDocument()
      expect(screen.getByText("fip-1")).toBeInTheDocument()
    })

    it("displays empty state placeholder when DNS domain is missing", () => {
      const fipWithoutDnsDomain = { ...mockFloatingIp, dns_domain: undefined }
      render(<FloatingIpDetailsView floatingIp={fipWithoutDnsDomain} />, { wrapper: TestWrapper })

      const placeholders = screen.getAllByText("- -")
      expect(placeholders.length).toBeGreaterThan(0)
    })

    it("displays empty state placeholder when DNS name is missing", () => {
      const fipWithoutDnsName = { ...mockFloatingIp, dns_name: undefined }
      render(<FloatingIpDetailsView floatingIp={fipWithoutDnsName} />, { wrapper: TestWrapper })

      const placeholders = screen.getAllByText("- -")
      expect(placeholders.length).toBeGreaterThan(0)
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

      expect(screen.getAllByText("203.0.113.100").length).toBeGreaterThan(0)
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

  describe("Description list structure", () => {
    it("renders multiple sections", () => {
      render(<FloatingIpDetailsView floatingIp={mockFloatingIp} />, { wrapper: TestWrapper })

      expect(screen.getByText("Basic Info")).toBeInTheDocument()
      expect(screen.getByText("Network & Routing")).toBeInTheDocument()
      expect(screen.getByText("DNS")).toBeInTheDocument()
    })
  })
})
