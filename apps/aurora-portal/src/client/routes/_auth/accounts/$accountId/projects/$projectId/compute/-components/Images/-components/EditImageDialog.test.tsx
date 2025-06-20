import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { EditImageModal } from "./EditImageModal"
import { GlanceImage } from "@/server/Compute/types/image"
import userEvent from "@testing-library/user-event"

describe("EditImageModal", () => {
  // mock image for testing
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
    act(() => {
      render(<EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)
    })
    expect(screen.getByText("Edit Image Details")).toBeDefined()
  })

  test("does not render when isOpen is false", () => {
    render(<EditImageModal isOpen={false} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)

    expect(screen.queryByText("Edit Image Details")).toBeNull()
  })

  test("displays the current image data", () => {
    render(<EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)

    const nameInput = screen.getByLabelText("Image Name") as HTMLInputElement
    const osTypeInput = screen.getByLabelText("OS Type") as HTMLInputElement
    const osDistroInput = screen.getByLabelText("OS Distribution") as HTMLInputElement

    expect(nameInput.value).toBe(mockImage.name)
    expect(osTypeInput.value).toBe(mockImage.os_type)
    expect(osDistroInput.value).toBe(mockImage.os_distro)
  })

  test("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup()
    render(<EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)

    const cancelButton = screen.getByText("Cancel")
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test("updates the image properties when inputs change", async () => {
    const user = userEvent.setup()
    render(<EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)

    const nameInput = screen.getByLabelText("Image Name")
    await user.clear(nameInput)
    await user.type(nameInput, "Updated Image Name")

    const statusSelect = screen.getByLabelText("Status")
    await user.click(statusSelect)
    const inactiveOption = screen.getByText("Inactive")
    await user.click(inactiveOption)

    const visibilitySelect = screen.getByLabelText("Visibility")
    await user.click(visibilitySelect)
    const publicOption = screen.getByText("Public")
    await user.click(publicOption)

    const saveButton = screen.getByText("Save Changes")
    await user.click(saveButton)

    expect(mockOnSave).toHaveBeenCalledTimes(1)
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockImage.id,
        name: "Updated Image Name",
        status: "inactive",
        visibility: "public",
        disk_format: mockImage.disk_format,
        os_type: mockImage.os_type,
        os_distro: mockImage.os_distro,
      })
    )

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test("calls onSave with updated image when Save Changes is clicked", async () => {
    const user = userEvent.setup()
    render(<EditImageModal isOpen={true} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />)
    const nameInput = screen.getByLabelText("Image Name")
    await user.clear(nameInput)
    await user.type(nameInput, "New Name")

    const saveButton = screen.getByText("Save Changes")
    await user.click(saveButton)

    expect(mockOnSave).toHaveBeenCalledTimes(1)
    expect(mockOnClose).toHaveBeenCalledTimes(1)

    const updatedImage = { ...mockImage, name: "New Name" }
    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining(updatedImage))
  })
})
