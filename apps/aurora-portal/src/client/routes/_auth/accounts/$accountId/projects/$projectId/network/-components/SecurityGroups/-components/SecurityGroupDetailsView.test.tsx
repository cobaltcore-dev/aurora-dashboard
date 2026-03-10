import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { SecurityGroupDetailsView } from "./SecurityGroupDetailsView"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

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
    render(
      <SecurityGroupDetailsView securityGroup={mockSecurityGroup} onEdit={onEdit} onDeleteRule={() => {}} />,
      { wrapper: createWrapper() }
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /Edit/i }))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
