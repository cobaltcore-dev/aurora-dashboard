import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { DeleteClusterDialog } from "./DeleteClusterDialog"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
describe("DeleteClusterDialog", () => {
  const mockOnClose = vi.fn()
  const mockOnDelete = vi.fn()
  const mockClusterName = "test-cluster"

  const setup = (isOpen: boolean, clusterName: string = mockClusterName) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <DeleteClusterDialog
            isOpen={isOpen}
            onClose={mockOnClose}
            onDelete={mockOnDelete}
            clusterName={clusterName}
          />
        </PortalProvider>
      </I18nProvider>
    )
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("should render the modal when isOpen is true", () => {
    setup(true)
    expect(screen.getByText("Delete")).toBeInTheDocument()
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText("Delete")).not.toBeInTheDocument()
    expect(screen.queryByText(/This action cannot be undone/i)).not.toBeInTheDocument()
  })

  it("should display the cluster name in the dialog content", () => {
    setup(true)
    expect(screen.getByText(/Would you like to remove the/i)).toBeInTheDocument()
    expect(screen.getAllByText(/test-cluster/).length).toBe(2) // One in the title, one in the content
    expect(screen.getByText(/from your project/i)).toBeInTheDocument()
  })

  it("should call onClose when the cancel button is clicked", () => {
    setup(true)
    const cancelButton = screen.getByText(/Cancel/i)
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onDelete and onClose when the delete button is clicked", () => {
    setup(true)
    const deleteButton = screen.getByRole("button", { name: /Delete$/i })
    fireEvent.click(deleteButton)
    expect(mockOnDelete).toHaveBeenCalledWith(mockClusterName)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onDelete with correct cluster name for different clusters", () => {
    const customClusterName = "custom-cluster-name"
    setup(true, customClusterName)

    const deleteButton = screen.getByRole("button", { name: /Delete$/i })
    fireEvent.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalledWith(customClusterName)
  })

  it("should call onDelete and onClose when modal confirm button is clicked", () => {
    setup(true)
    const confirmButton = screen.getByRole("button", { name: /Delete/i })
    fireEvent.click(confirmButton)
    expect(mockOnDelete).toHaveBeenCalledWith(mockClusterName)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should display warning message", () => {
    setup(true)
    expect(
      screen.getByText("This action cannot be undone. The cluster will be permanently deleted.")
    ).toBeInTheDocument()
  })

  it("should display consequence message with cluster name", () => {
    setup(true)
    expect(screen.getByText(/your project will no longer have access to the/i)).toBeInTheDocument()
    expect(screen.getByText(/resources/i)).toBeInTheDocument()
  })

  it("should handle multiple delete buttons correctly", () => {
    setup(true)
    // There are multiple delete buttons due to Modal's built-in buttons and custom footer buttons
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i })

    // Click the first delete button
    fireEvent.click(deleteButtons[0])
    expect(mockOnDelete).toHaveBeenCalledWith(mockClusterName)
  })
})
