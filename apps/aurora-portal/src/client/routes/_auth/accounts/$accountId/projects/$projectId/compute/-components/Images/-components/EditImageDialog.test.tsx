import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { EditImageModal } from "./EditImageModal"
import { GlanceImage } from "@/server/Compute/types/image"
import { PortalProvider } from "@cloudoperators/juno-ui-components/index"

describe("EditImageModal", () => {
  // Sample image for testing
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

  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  test("renders when isOpen is true", () => {
    render(
      <PortalProvider>
        <EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />
      </PortalProvider>
    )

    expect(screen.getByText("Edit Image Details")).toBeDefined()
  })

  // test("does not render when isOpen is false", () => {
  //   render(<EditImageModal isOpen={false} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)

  //   expect(screen.queryByText("Edit Image Details")).toBeNull()
  // })

  // test("displays the current image data", () => {
  //   render(<EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)

  //   // Check if input fields have the correct initial values
  //   const nameInput = document.getElementById("name") as HTMLInputElement
  //   const osTypeInput = document.getElementById("os_type") as HTMLInputElement
  //   const osDistroInput = document.getElementById("os_distro") as HTMLInputElement

  //   expect(nameInput.value).toBe(mockImage.name)
  //   expect(osTypeInput.value).toBe(mockImage.os_type)
  //   expect(osDistroInput.value).toBe(mockImage.os_distro)
  // })

  // test("calls onClose when Cancel button is clicked", () => {
  //   render(<EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)

  //   const cancelButton = screen.getByText("Cancel")
  //   fireEvent.click(cancelButton)

  //   expect(mockOnClose).toHaveBeenCalledTimes(1)
  // })

  // test("updates the image properties when inputs change", () => {
  //   render(<EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)

  //   // Get inputs
  //   const nameInput = document.getElementById("name") as HTMLInputElement
  //   const statusSelect = document.getElementById("status") as HTMLSelectElement
  //   const visibilitySelect = document.getElementById("visibility") as HTMLSelectElement

  //   // Change values
  //   fireEvent.change(nameInput, { target: { value: "Updated Image Name" } })
  //   fireEvent.change(statusSelect, { target: { value: "inactive" } })
  //   fireEvent.change(visibilitySelect, { target: { value: "public" } })

  //   // Click save button
  //   const saveButton = screen.getByText("Save Changes")
  //   fireEvent.click(saveButton)

  //   // Verify onSave was called with the updated image
  //   expect(mockOnSave).toHaveBeenCalledTimes(1)
  //   expect(mockOnSave).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       id: mockImage.id,
  //       name: "Updated Image Name",
  //       status: "inactive",
  //       visibility: "public",
  //       disk_format: mockImage.disk_format,
  //       os_type: mockImage.os_type,
  //       os_distro: mockImage.os_distro,
  //     })
  //   )

  //   // Verify onClose was called
  //   expect(mockOnClose).toHaveBeenCalledTimes(1)
  // })

  // test("calls onSave with updated image when Save Changes is clicked", () => {
  //   render(<EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)

  //   // Make a simple change
  //   const nameInput = document.getElementById("name") as HTMLInputElement
  //   fireEvent.change(nameInput, { target: { value: "New Name" } })

  //   // Click save button
  //   const saveButton = screen.getByText("Save Changes")
  //   fireEvent.click(saveButton)

  //   // Verify both functions were called
  //   expect(mockOnSave).toHaveBeenCalledTimes(1)
  //   expect(mockOnClose).toHaveBeenCalledTimes(1)

  //   // Verify the updated data
  //   const updatedImage = { ...mockImage, name: "New Name" }
  //   expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining(updatedImage))
  // })
})
