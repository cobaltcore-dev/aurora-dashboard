import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { SecurityGroupDetailsView } from "./SecurityGroupDetailsView"
import type { SecurityGroup, SecurityGroupRule } from "@/server/Network/types/securityGroup"

const mockRules: SecurityGroupRule[] = [
  {
    id: "rule-1",
    direction: "ingress",
    protocol: "tcp",
    port_range_min: 80,
    port_range_max: 80,
    remote_ip_prefix: "0.0.0.0/0",
    description: "HTTP traffic",
    ethertype: "IPv4",
  },
  {
    id: "rule-2",
    direction: "egress",
    protocol: "tcp",
    port_range_min: 443,
    port_range_max: 443,
    remote_ip_prefix: "0.0.0.0/0",
    description: "HTTPS traffic",
    ethertype: "IPv4",
  },
  {
    id: "rule-3",
    direction: "ingress",
    protocol: "icmp",
    port_range_min: null,
    port_range_max: null,
    remote_ip_prefix: "10.0.0.0/8",
    description: "ICMP ping",
    ethertype: "IPv4",
  },
]

const mockSecurityGroup: SecurityGroup = {
  id: "sg-123",
  name: "web-servers",
  description: "Security group for web servers",
  project_id: "project-456",
  tenant_id: "tenant-789",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
  revision_number: 1,
  tags: ["production", "web"],
  stateful: true,
  shared: false,
  security_group_rules: [],
}

const createWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <PortalProvider>{children}</PortalProvider>
    </I18nProvider>
  )

describe("SecurityGroupDetailsView", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders all security group fields", () => {
    render(<SecurityGroupDetailsView securityGroup={mockSecurityGroup} onDeleteRule={() => {}} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText("Security Group Basic Info")).toBeInTheDocument()
    expect(screen.getByText("sg-123")).toBeInTheDocument()
    expect(screen.getByText("web-servers")).toBeInTheDocument()
    expect(screen.getByText("Security group for web servers")).toBeInTheDocument()
    expect(screen.getByText("project-456")).toBeInTheDocument()
    expect(screen.getByText("production, web")).toBeInTheDocument()
  })

  it("displays em dash for missing description", () => {
    const sgWithoutDescription = { ...mockSecurityGroup, description: null }
    render(<SecurityGroupDetailsView securityGroup={sgWithoutDescription} onDeleteRule={() => {}} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("displays em dash for empty tags", () => {
    const sgWithoutTags = { ...mockSecurityGroup, tags: [] }
    render(<SecurityGroupDetailsView securityGroup={sgWithoutTags} onDeleteRule={() => {}} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("displays boolean values as Yes/No", () => {
    render(<SecurityGroupDetailsView securityGroup={mockSecurityGroup} onDeleteRule={() => {}} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText("Yes")).toBeInTheDocument()
    expect(screen.getByText("No")).toBeInTheDocument()
  })

  it("calls onEdit when Edit button is clicked", async () => {
    const onEdit = vi.fn()
    render(<SecurityGroupDetailsView securityGroup={mockSecurityGroup} onEdit={onEdit} onDeleteRule={() => {}} />, {
      wrapper: createWrapper(),
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /Edit/i }))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  describe("Client-side filtering", () => {
    const sgWithRules = { ...mockSecurityGroup, security_group_rules: mockRules }

    it("filters rules by direction - ingress", () => {
      render(
        <SecurityGroupDetailsView securityGroup={sgWithRules} onDeleteRule={() => {}} rulesDirection="ingress" />,
        {
          wrapper: createWrapper(),
        }
      )

      // Should show 2 ingress rules
      expect(screen.getByText("HTTP traffic")).toBeInTheDocument()
      expect(screen.getByText("ICMP ping")).toBeInTheDocument()
      // Should not show egress rule
      expect(screen.queryByText("HTTPS traffic")).not.toBeInTheDocument()
    })

    it("filters rules by direction - egress", () => {
      render(<SecurityGroupDetailsView securityGroup={sgWithRules} onDeleteRule={() => {}} rulesDirection="egress" />, {
        wrapper: createWrapper(),
      })

      // Should show 1 egress rule
      expect(screen.getByText("HTTPS traffic")).toBeInTheDocument()
      // Should not show ingress rules
      expect(screen.queryByText("HTTP traffic")).not.toBeInTheDocument()
      expect(screen.queryByText("ICMP ping")).not.toBeInTheDocument()
    })

    it("filters rules by search term - description", () => {
      render(<SecurityGroupDetailsView securityGroup={sgWithRules} onDeleteRule={() => {}} rulesSearchTerm="HTTPS" />, {
        wrapper: createWrapper(),
      })

      // Should show only HTTPS rule
      expect(screen.getByText("HTTPS traffic")).toBeInTheDocument()
      expect(screen.queryByText("HTTP traffic")).not.toBeInTheDocument()
      expect(screen.queryByText("ICMP ping")).not.toBeInTheDocument()
    })

    it("filters rules by search term - protocol", () => {
      render(<SecurityGroupDetailsView securityGroup={sgWithRules} onDeleteRule={() => {}} rulesSearchTerm="icmp" />, {
        wrapper: createWrapper(),
      })

      // Should show only ICMP rule
      expect(screen.getByText("ICMP ping")).toBeInTheDocument()
      expect(screen.queryByText("HTTP traffic")).not.toBeInTheDocument()
      expect(screen.queryByText("HTTPS traffic")).not.toBeInTheDocument()
    })

    it("filters rules by search term - IP prefix", () => {
      render(
        <SecurityGroupDetailsView securityGroup={sgWithRules} onDeleteRule={() => {}} rulesSearchTerm="10.0.0" />,
        {
          wrapper: createWrapper(),
        }
      )

      // Should show only rule with 10.0.0.0/8
      expect(screen.getByText("ICMP ping")).toBeInTheDocument()
      expect(screen.queryByText("HTTP traffic")).not.toBeInTheDocument()
      expect(screen.queryByText("HTTPS traffic")).not.toBeInTheDocument()
    })

    it("combines direction and search filters", () => {
      render(
        <SecurityGroupDetailsView
          securityGroup={sgWithRules}
          onDeleteRule={() => {}}
          rulesDirection="ingress"
          rulesSearchTerm="HTTP"
        />,
        {
          wrapper: createWrapper(),
        }
      )

      // Should show only HTTP ingress rule (not HTTPS egress)
      expect(screen.getByText("HTTP traffic")).toBeInTheDocument()
      expect(screen.queryByText("HTTPS traffic")).not.toBeInTheDocument()
      expect(screen.queryByText("ICMP ping")).not.toBeInTheDocument()
    })

    it("shows all rules when no filters applied", () => {
      render(<SecurityGroupDetailsView securityGroup={sgWithRules} onDeleteRule={() => {}} />, {
        wrapper: createWrapper(),
      })

      // Should show all 3 rules
      expect(screen.getByText("HTTP traffic")).toBeInTheDocument()
      expect(screen.getByText("HTTPS traffic")).toBeInTheDocument()
      expect(screen.getByText("ICMP ping")).toBeInTheDocument()
    })

    it("shows empty state when filters match no rules", () => {
      render(
        <SecurityGroupDetailsView securityGroup={sgWithRules} onDeleteRule={() => {}} rulesSearchTerm="nonexistent" />,
        {
          wrapper: createWrapper(),
        }
      )

      expect(screen.getByText("No rules match your filters")).toBeInTheDocument()
    })
  })
})
