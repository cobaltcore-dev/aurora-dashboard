import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { EditImageModal } from "./EditImageModal"
import { GlanceImage } from "@/server/Compute/types/image"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

const renderEditModal = (isOpen = true, mockOnClose = vi.fn(), mockImage: GlanceImage, mockOnSave = vi.fn()) => {
  return render(
    <PortalProvider>
      <EditImageModal isOpen={isOpen} onClose={mockOnClose} image={mockImage} onSave={mockOnSave} />
    </PortalProvider>
  )
}

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
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)
    expect(screen.getByText("Edit Image Details")).toBeDefined()
  })

  test("does not render when isOpen is false", () => {
    renderEditModal(false, mockOnClose, mockImage, mockOnSave)

    expect(screen.queryByText("Edit Image Details")).toBeNull()
  })

  test("displays the current image data", () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const nameInput = screen.getByLabelText("Image Name") as HTMLInputElement
    const osTypeInput = screen.getByLabelText("OS Type") as HTMLInputElement
    const osDistroInput = screen.getByLabelText("OS Distribution") as HTMLInputElement

    expect(nameInput.value).toBe(mockImage.name)
    expect(osTypeInput.value).toBe(mockImage.os_type)
    expect(osDistroInput.value).toBe(mockImage.os_distro)
  })

  test("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const cancelButton = screen.getByText("Cancel")
    await act(async () => {
      await user.click(cancelButton)
    })

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test("updates the image properties when inputs change", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const nameInput = screen.getByLabelText("Image Name")
    await act(async () => {
      await user.clear(nameInput)
      await user.type(nameInput, "Updated Image Name")
    })

    const statusSelect = screen.getByLabelText("Status")
    await act(async () => {
      await user.click(statusSelect)
    })
    const inactiveOption = screen.getByText("Inactive")
    await act(async () => {
      await user.click(inactiveOption)
    })
    const visibilitySelect = screen.getByLabelText("Visibility")
    await act(async () => {
      await user.click(visibilitySelect)
    })
    const publicOption = screen.getByText("Public")
    await act(async () => {
      await user.click(publicOption)
    })
    const saveButton = screen.getByText("Save Changes")
    await act(async () => {
      await user.click(saveButton)
    })

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
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)
    const nameInput = screen.getByLabelText("Image Name")
    await act(async () => {
      await user.clear(nameInput)
      await user.type(nameInput, "New Name")
    })

    const saveButton = screen.getByText("Save Changes")
    await act(async () => {
      await user.click(saveButton)
    })
    expect(mockOnSave).toHaveBeenCalledTimes(1)
    expect(mockOnClose).toHaveBeenCalledTimes(1)

    const updatedImage = { ...mockImage, name: "New Name" }
    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining(updatedImage))
  })
})
