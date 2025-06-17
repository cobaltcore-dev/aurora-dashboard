import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CreateImageModal } from "./CreateImageModal"

describe("CreateImageModal", () => {
  const mockOnCreate = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  // test("renders when isOpen is true", () => {
  //   render(<CreateImageModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

  //   expect(screen.getByTestId("dialog")).toBeDefined()
  //   expect(screen.getByTestId("dialog-title")).toBeDefined()
  //   expect(screen.getByText("Create New Image")).toBeDefined()
  // })

  test("does not render when isOpen is false", () => {
    render(<CreateImageModal isOpen={false} onClose={mockOnClose} onCreate={mockOnCreate} />)

    expect(screen.queryByTestId("dialog")).toBeNull()
  })

  // test("calls onClose when Cancel button is clicked", () => {
  //   render(<CreateImageModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

  //   const cancelButton = screen.getByText("Cancel")
  //   fireEvent.click(cancelButton)

  //   expect(mockOnClose).toHaveBeenCalledTimes(1)
  // })

  // test("calls onCreate with form data when Create button is clicked", () => {
  //   render(<CreateImageModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

  //   // Get the inputs by their label text and then find the associated input
  //   const nameLabel = screen.getByText("Image Name")
  //   const nameInput = nameLabel.closest("label")?.nextElementSibling || document.getElementById("name")

  //   // Fill out form
  //   if (nameInput) {
  //     fireEvent.change(nameInput, { target: { value: "Test Image" } })
  //   }

  //   // Get Create button by its text
  //   const createButton = screen.getByText("Create Image")

  //   // Click the button
  //   fireEvent.click(createButton)

  //   // Check that onCreate was called with expected data
  //   expect(mockOnCreate).toHaveBeenCalledTimes(1)
  //   expect(mockOnCreate).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       name: "Test Image",
  //       status: "active", // Default value
  //       visibility: "private", // Default value
  //       disk_format: "qcow2", // Default value
  //     })
  //   )

  //   // Check that onClose was called
  //   expect(mockOnClose).toHaveBeenCalledTimes(1)
  // })

  // test("handles form input changes", () => {
  //   render(<CreateImageModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />)

  //   // Get inputs by their labels
  //   const nameLabel = screen.getByText("Image Name")
  //   const nameInput = nameLabel.closest("label")?.nextElementSibling || document.getElementById("name")

  //   const statusLabel = screen.getByText("Status")
  //   const statusSelect = statusLabel.closest("label")?.nextElementSibling || document.getElementById("status")

  //   // Change values
  //   if (nameInput) {
  //     fireEvent.change(nameInput, { target: { value: "Test Image Name" } })
  //   }

  //   if (statusSelect) {
  //     fireEvent.change(statusSelect, { target: { value: "inactive" } })
  //   }

  //   // Submit the form
  //   const createButton = screen.getByText("Create Image")
  //   fireEvent.click(createButton)

  //   // Check correct values were passed to onCreate
  //   expect(mockOnCreate).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       name: "Test Image Name",
  //       status: "inactive",
  //     })
  //   )
  // })
})
