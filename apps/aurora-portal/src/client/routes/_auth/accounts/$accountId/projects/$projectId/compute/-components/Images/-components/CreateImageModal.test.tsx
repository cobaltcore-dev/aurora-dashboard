import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { CreateImageModal } from "./CreateImageModal"
import userEvent from "@testing-library/user-event"

describe("CreateImageModal", () => {
  const mockOnCreate = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  test("renders when isOpen is true", () => {
    render(<CreateImageModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

    expect(screen.getByText("Create New Image")).toBeDefined()
  })

  test("does not render when isOpen is false", () => {
    render(<CreateImageModal isOpen={false} onClose={mockOnClose} onCreate={mockOnCreate} />)

    expect(screen.queryByTestId("dialog")).toBeNull()
  })

  test("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup()
    render(<CreateImageModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

    const cancelButton = screen.getByText("Cancel")
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test("calls onCreate with form data when Create button is clicked", async () => {
    const user = userEvent.setup()
    render(<CreateImageModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

    const nameInput = screen.getByLabelText("Image Name")
    await user.type(nameInput, "Test Image")

    const createButton = screen.getByText("Create Image")
    await user.click(createButton)

    // Check that onCreate was called with expected data
    expect(mockOnCreate).toHaveBeenCalledTimes(1)
    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Image",
        status: "active", // Default value
        visibility: "private", // Default value
        disk_format: "qcow2", // Default value
      })
    )

    // Check that onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test("allows user to submit form", async () => {
    const user = userEvent.setup()
    render(<CreateImageModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

    const nameInput = screen.getByLabelText("Image Name")
    await user.type(nameInput, "Test Image Name")

    const statusSelect = screen.getByLabelText("Status")
    await user.click(statusSelect)
    const inactiveOption = screen.getByText("Inactive")
    await user.click(inactiveOption)

    const createButton = screen.getByText("Create Image")
    await user.click(createButton)

    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Image Name",
        status: "inactive",
      })
    )
  })
})
