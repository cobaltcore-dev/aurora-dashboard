import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteSecurityGroupDialog } from "./DeleteSecurityGroupDialog"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

const mockSecurityGroup: SecurityGroup = {
  id: "sg-123",
  name: "test-security-group",
  description: "Test security group",
  project_id: "project-1",
  tenant_id: "tenant-1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  revision_number: 1,
  tags: [],
  stateful: true,
  shared: false,
  security_group_rules: [],
}

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <PortalProvider>{children}</PortalProvider>
    </I18nProvider>
  )
}

describe("DeleteSecurityGroupDialog", () => {
  const mockOnClose = vi.fn()
  const mockOnDelete = vi.fn()

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders with security group name", () => {
    render(
      <DeleteSecurityGroupDialog
        isOpen={true}
        securityGroup={mockSecurityGroup}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText("Delete Security Group")).toBeInTheDocument()
    expect(screen.getByText("test-security-group")).toBeInTheDocument()
  })

  it("displays error message when provided", () => {
    render(
      <DeleteSecurityGroupDialog
        isOpen={true}
        securityGroup={mockSecurityGroup}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
        error="Failed to delete security group"
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText("Failed to delete security group")).toBeInTheDocument()
  })

  it("requires typing 'delete' to enable delete button", async () => {
    const user = userEvent.setup()
    render(
      <DeleteSecurityGroupDialog
        isOpen={true}
        securityGroup={mockSecurityGroup}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() }
    )

    const deleteButton = screen.getByTestId("confirm-delete-button")
    expect(deleteButton).toBeDisabled()

    const input = screen.getByTestId("delete-confirmation-input")
    await user.type(input, "delete")

    expect(deleteButton).not.toBeDisabled()
  })

  it("calls onDelete with security group ID when confirmed", async () => {
    const user = userEvent.setup()
    render(
      <DeleteSecurityGroupDialog
        isOpen={true}
        securityGroup={mockSecurityGroup}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() }
    )

    const input = screen.getByTestId("delete-confirmation-input")
    await user.type(input, "delete")

    const deleteButton = screen.getByTestId("confirm-delete-button")
    await user.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalledWith("sg-123")
  })

  it("does not call onDelete without confirmation", async () => {
    const user = userEvent.setup()
    render(
      <DeleteSecurityGroupDialog
        isOpen={true}
        securityGroup={mockSecurityGroup}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() }
    )

    const deleteButton = screen.getByTestId("confirm-delete-button")
    await user.click(deleteButton)

    expect(mockOnDelete).not.toHaveBeenCalled()
  })

  it("calls onClose when cancel is clicked", async () => {
    const user = userEvent.setup()
    render(
      <DeleteSecurityGroupDialog
        isOpen={true}
        securityGroup={mockSecurityGroup}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() }
    )

    const cancelButton = screen.getByText("Cancel")
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it("shows deleting state", () => {
    render(
      <DeleteSecurityGroupDialog
        isOpen={true}
        securityGroup={mockSecurityGroup}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
        isDeleting={true}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText("Deleting...")).toBeInTheDocument()
    expect(screen.getByTestId("confirm-delete-button")).toBeDisabled()
  })
})
