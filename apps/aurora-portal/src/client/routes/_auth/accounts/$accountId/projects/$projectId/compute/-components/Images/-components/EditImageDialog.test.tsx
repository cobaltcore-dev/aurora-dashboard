import { describe, test, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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

  test("renders when isOpen is true", async () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    await waitFor(() => expect(screen.getByText("Edit Image Details")).toBeDefined())
  })

  test("does not render when isOpen is false", () => {
    renderEditModal(false, mockOnClose, mockImage, mockOnSave)

    expect(screen.queryByText("Edit Image Details")).toBeNull()
  })

  test("displays the current image data", async () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const nameInput = screen.getByLabelText("Image Name") as HTMLInputElement
    const osTypeInput = screen.getByLabelText("OS Type") as HTMLInputElement
    const osDistroInput = screen.getByLabelText("OS Distribution") as HTMLInputElement

    await waitFor(() => {
      expect(nameInput.value).toBe(mockImage.name)
      expect(osTypeInput.value).toBe(mockImage.os_type)
      expect(osDistroInput.value).toBe(mockImage.os_distro)
    })
  })

  test("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const cancelButton = screen.getByText("Cancel")
    await user.click(cancelButton)

    await waitFor(() => expect(mockOnClose).toHaveBeenCalledTimes(1))
  })

  test("updates the image properties when inputs change", async () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    await waitFor(async () => {
      const nameInput = screen.getByLabelText("Image Name")

      await fireEvent.change(nameInput, { target: { value: "" } })
      await fireEvent.change(nameInput, { target: { value: "Updated Image Name" } })
    })

    await waitFor(async () => {
      const statusSelect = screen.getByLabelText("Status")
      await fireEvent.click(statusSelect)
    })

    await waitFor(async () => {
      const inactiveOption = screen.getByText("Inactive")
      await fireEvent.click(inactiveOption)
    })

    await waitFor(async () => {
      const visibilitySelect = screen.getByLabelText("Visibility")
      await fireEvent.click(visibilitySelect)
    })

    await waitFor(async () => {
      const publicOption = screen.getByText("Public")
      await fireEvent.click(publicOption)
    })

    await waitFor(async () => {
      const saveButton = screen.getByText("Save Changes")
      await fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
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
    })
  })

  test("calls onSave with updated image when Save Changes is clicked", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const nameInput = screen.getByLabelText("Image Name")
    await user.clear(nameInput)
    await user.type(nameInput, "New Name")

    const saveButton = screen.getByText("Save Changes")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    expect(mockOnClose).toHaveBeenCalledTimes(1)

    const updatedImage = { ...mockImage, name: "New Name" }
    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining(updatedImage))
  })
})
