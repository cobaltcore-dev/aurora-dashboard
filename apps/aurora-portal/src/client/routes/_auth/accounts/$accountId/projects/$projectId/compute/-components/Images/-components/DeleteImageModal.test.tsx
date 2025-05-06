import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { DeleteImageModal } from "./DeleteImageModal"
import { GlanceImage } from "@/server/Compute/types/image"

describe("DeleteImageModal", () => {
  const mockOnClose = vi.fn()
  const mockOnDelete = vi.fn()
  const mockImage: GlanceImage = {
    id: "test-id",
    name: "Test Image",
    status: "active",
    visibility: "private",
    disk_format: "qcow2",
    os_type: "Linux",
    os_distro: "Ubuntu",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    size: 1024,
  }
  const setup = (isOpen: boolean) => {
    render(<DeleteImageModal isOpen={isOpen} onClose={mockOnClose} onDelete={mockOnDelete} image={mockImage} />)
  }

  it("should render the modal when isOpen is true", () => {
    setup(true)
    expect(screen.getByText(/Are you sure you want to delete the image/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText(/Are you sure you want to delete the image/i)).not.toBeInTheDocument()
  })

  it("should call onClose when the cancel button is clicked", () => {
    setup(true)
    const cancelButton = screen.getByText(/Cancel/i)
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onDelete when the delete button is clicked", () => {
    setup(true)
    const deleteButton = screen.getAllByRole("button", { name: /Delete/i })[0]
    fireEvent.click(deleteButton)
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
  })
})
