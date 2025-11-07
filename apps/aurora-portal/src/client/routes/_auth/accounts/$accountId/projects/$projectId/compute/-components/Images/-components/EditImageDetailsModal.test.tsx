import { describe, test, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react"
import { EditImageDetailsModal } from "./EditImageDetailsModal"
import { GlanceImage } from "@/server/Compute/types/image"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"

const renderEditModal = (
  isOpen = true,
  mockOnClose = vi.fn(),
  mockImage: GlanceImage,
  mockOnSave = vi.fn(),
  isLoading = false
) => {
  return render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EditImageDetailsModal
          isOpen={isOpen}
          onClose={mockOnClose}
          image={mockImage}
          onSave={mockOnSave}
          isLoading={isLoading}
        />
      </PortalProvider>
    </I18nProvider>
  )
}

describe("EditImageDetailsModal", () => {
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
    tags: ["production", "linux"],
    protected: false,
    min_disk: 10,
    min_ram: 512,
  }

  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(async () => {
    vi.resetAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
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
    const tagsInput = screen.getByLabelText("Tags") as HTMLInputElement
    const protectedCheckbox = screen.getByLabelText("Protected") as HTMLInputElement
    const minDiskInput = screen.getByLabelText("Minimum Disk (GB)") as HTMLInputElement
    const minRamInput = screen.getByLabelText("Minimum RAM (MB)") as HTMLInputElement

    await waitFor(() => {
      expect(nameInput.value).toBe(mockImage.name)
      expect(tagsInput.value).toBe("") // Tags input should be empty (tags shown as pills)
      expect(protectedCheckbox.checked).toBe(false)
      expect(minDiskInput.value).toBe("10")
      expect(minRamInput.value).toBe("512")
    })

    // Check that existing tags are displayed as pills
    expect(screen.getByText("production")).toBeDefined()
    expect(screen.getByText("linux")).toBeDefined()
  })

  test("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const cancelButton = screen.getByText("Cancel")
    await user.click(cancelButton)

    await waitFor(() => expect(mockOnClose).toHaveBeenCalledTimes(1))
  })

  test("updates the image name when input changes", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const nameInput = screen.getByLabelText("Image Name")
    await user.clear(nameInput)
    await user.type(nameInput, "Updated Image Name")

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    // Should only include the changed property
    expect(mockOnSave).toHaveBeenCalledWith({
      name: "Updated Image Name",
    })
  })

  test("updates tags when input changes", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const tagsInput = screen.getByLabelText("Tags")
    const addButton = screen.getByText("Add")

    // Remove existing tags first by clicking their close buttons
    const productionPill = screen.getByText("production").closest(".juno-pill")
    const linuxPill = screen.getByText("linux").closest(".juno-pill")

    if (productionPill) {
      const closeButton = productionPill.querySelector("button")
      if (closeButton) await user.click(closeButton)
    }
    if (linuxPill) {
      const closeButton = linuxPill.querySelector("button")
      if (closeButton) await user.click(closeButton)
    }

    // Add new tags one by one
    await user.type(tagsInput, "staging")
    await user.click(addButton)

    await user.type(tagsInput, "ubuntu")
    await user.click(addButton)

    await user.type(tagsInput, "test")
    await user.click(addButton)

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    // Should only include the changed property
    expect(mockOnSave).toHaveBeenCalledWith({
      tags: ["staging", "ubuntu", "test"],
    })
  })

  test("updates visibility when select changes", async () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const visibilitySelect = screen.getByLabelText("Visibility")
    await fireEvent.click(visibilitySelect)

    await waitFor(async () => {
      const publicOption = screen.getByText("Public")
      await fireEvent.click(publicOption)
    })

    const saveButton = screen.getByTestId("save-image-updates-button")
    await fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    expect(mockOnSave).toHaveBeenCalledWith({
      visibility: "public",
    })
  })

  test("updates protected checkbox when clicked", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const protectedCheckbox = screen.getByLabelText("Protected")
    await user.click(protectedCheckbox)

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    expect(mockOnSave).toHaveBeenCalledWith({
      protected: true,
    })
  })

  test("updates min_disk when input changes", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const minDiskInput = screen.getByLabelText("Minimum Disk (GB)")
    await user.clear(minDiskInput)
    await user.type(minDiskInput, "20")

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    expect(mockOnSave).toHaveBeenCalledWith({
      min_disk: 20,
    })
  })

  test("updates min_ram when input changes", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const minRamInput = screen.getByLabelText("Minimum RAM (MB)")
    await user.clear(minRamInput)
    await user.type(minRamInput, "1024")

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    expect(mockOnSave).toHaveBeenCalledWith({
      min_ram: 1024,
    })
  })

  test("validates required name field", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const nameInput = screen.getByLabelText("Image Name")
    await user.clear(nameInput)

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText("Image name is required")).toBeDefined()
    })

    expect(mockOnSave).not.toHaveBeenCalled()
  })

  test("validates non-negative min_disk", async () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const minDiskInput = screen.getByLabelText("Minimum Disk (GB)")
    const saveButton = screen.getByTestId("save-image-updates-button")

    await act(async () => {
      fireEvent.change(minDiskInput, { target: { value: "-5" } })
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(screen.getByText("Minimum disk must be 0 or greater")).toBeDefined()
    })

    expect(mockOnSave).not.toHaveBeenCalled()
  })

  test("validates non-negative min_ram", async () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const minRamInput = screen.getByLabelText("Minimum RAM (MB)")
    const saveButton = screen.getByTestId("save-image-updates-button")

    await act(async () => {
      fireEvent.change(minRamInput, { target: { value: "-100" } })
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(screen.getByText("Minimum RAM must be 0 or greater")).toBeDefined()
    })

    expect(mockOnSave).not.toHaveBeenCalled()
  })

  test("shows loading spinner when isLoading is true", async () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave, true)

    await waitFor(() => {
      const spinners = screen.getAllByRole("progressbar")
      expect(spinners.length).toBeGreaterThan(0)
    })
  })

  test("disables buttons when isLoading is true", async () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave, true)

    await waitFor(() => {
      const saveButton = screen.getByTestId("save-image-updates-button")
      const cancelButton = screen.getByText("Cancel")

      expect(saveButton).toHaveProperty("disabled", true)
      expect(cancelButton).toHaveProperty("disabled", true)
    })
  })

  test("clears errors when field is corrected", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    // First, create an error
    const nameInput = screen.getByLabelText("Image Name")
    await user.clear(nameInput)

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText("Image name is required")).toBeDefined()
    })

    // Now fix the error
    await user.type(nameInput, "Fixed Name")

    await waitFor(() => {
      expect(screen.queryByText("Image name is required")).toBeNull()
    })
  })

  test("handles empty tags gracefully", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    // Remove existing tags by clicking their close buttons
    const productionPill = screen.getByText("production").closest(".juno-pill")
    const linuxPill = screen.getByText("linux").closest(".juno-pill")

    if (productionPill) {
      const closeButton = productionPill.querySelector("button")
      if (closeButton) await user.click(closeButton)
    }
    if (linuxPill) {
      const closeButton = linuxPill.querySelector("button")
      if (closeButton) await user.click(closeButton)
    }

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    expect(mockOnSave).toHaveBeenCalledWith({
      tags: [],
    })
  })

  test("parses tags with extra spaces correctly", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const tagsInput = screen.getByLabelText("Tags")
    const addButton = screen.getByText("Add")

    // Remove existing tags first
    const productionPill = screen.getByText("production").closest(".juno-pill")
    const linuxPill = screen.getByText("linux").closest(".juno-pill")

    if (productionPill) {
      const closeButton = productionPill.querySelector("button")
      if (closeButton) await user.click(closeButton)
    }
    if (linuxPill) {
      const closeButton = linuxPill.querySelector("button")
      if (closeButton) await user.click(closeButton)
    }

    // Add tags with extra spaces - they should be trimmed
    await user.type(tagsInput, "  tag1  ")
    await user.click(addButton)

    await user.type(tagsInput, "  tag2  ")
    await user.click(addButton)

    await user.type(tagsInput, "  tag3  ")
    await user.click(addButton)

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    expect(mockOnSave).toHaveBeenCalledWith({
      tags: ["tag1", "tag2", "tag3"],
    })
  })

  test("adds tag when Enter key is pressed", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const tagsInput = screen.getByLabelText("Tags")

    // Add a tag by pressing Enter
    await user.type(tagsInput, "newtag{Enter}")

    // Check that the tag appears as a pill
    await waitFor(() => {
      expect(screen.getByText("newtag")).toBeDefined()
    })

    // Input should be cleared
    expect((tagsInput as HTMLInputElement).value).toBe("")
  })

  test("Add button is disabled when input is empty", async () => {
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByText("Add") as HTMLButtonElement

    // Button should be disabled initially (empty input)
    expect(addButton.disabled).toBe(true)
  })

  test("Add button is enabled when input has text", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const tagsInput = screen.getByLabelText("Tags")
    const addButton = screen.getByText("Add") as HTMLButtonElement

    await user.type(tagsInput, "test")

    await waitFor(() => {
      expect(addButton.disabled).toBe(false)
    })
  })

  test("does not add duplicate tags", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const tagsInput = screen.getByLabelText("Tags")
    const addButton = screen.getByText("Add")

    // Try to add a tag that already exists
    await user.type(tagsInput, "production")
    await user.click(addButton)

    // Should still only have one "production" pill
    const productionPills = screen.getAllByText("production")
    expect(productionPills.length).toBe(1)

    // Input should be cleared
    expect((tagsInput as HTMLInputElement).value).toBe("")
  })

  test("removes tag when pill close button is clicked", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    // Find the production tag pill and click its close button
    const productionPill = screen.getByText("production").closest(".juno-pill")
    expect(productionPill).toBeDefined()

    const closeButton = productionPill?.querySelector("button")
    expect(closeButton).toBeDefined()

    if (closeButton) {
      await user.click(closeButton)
    }

    // Tag should be removed
    await waitFor(() => {
      expect(screen.queryByText("production")).toBeNull()
    })

    // Linux tag should still be present
    expect(screen.getByText("linux")).toBeDefined()
  })

  test("calls onSave with Partial<GlanceImage> instead of full GlanceImage", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    const nameInput = screen.getByLabelText("Image Name")
    await user.clear(nameInput)
    await user.type(nameInput, "New Name")

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    // Should only include changed properties
    const calledWith = mockOnSave.mock.calls[0][0]
    expect(calledWith).toEqual({
      name: "New Name",
    })

    // Should NOT include properties like id, status, disk_format, etc.
    expect(calledWith).not.toHaveProperty("id")
    expect(calledWith).not.toHaveProperty("status")
    expect(calledWith).not.toHaveProperty("disk_format")
  })

  test("does not send unchanged properties", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    // Change only the name
    const nameInput = screen.getByLabelText("Image Name")
    await user.clear(nameInput)
    await user.type(nameInput, "New Name")

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    // Should only include the changed property
    const calledWith = mockOnSave.mock.calls[0][0]
    expect(calledWith).toEqual({
      name: "New Name",
    })

    // Should NOT include unchanged properties
    expect(calledWith).not.toHaveProperty("tags")
    expect(calledWith).not.toHaveProperty("visibility")
    expect(calledWith).not.toHaveProperty("protected")
    expect(calledWith).not.toHaveProperty("min_disk")
    expect(calledWith).not.toHaveProperty("min_ram")
  })

  test("sends multiple changed properties", async () => {
    const user = userEvent.setup()
    renderEditModal(true, mockOnClose, mockImage, mockOnSave)

    // Change name and protected
    const nameInput = screen.getByLabelText("Image Name")
    await user.clear(nameInput)
    await user.type(nameInput, "New Name")

    const protectedCheckbox = screen.getByLabelText("Protected")
    await user.click(protectedCheckbox)

    const saveButton = screen.getByTestId("save-image-updates-button")
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    // Should include both changed properties
    expect(mockOnSave).toHaveBeenCalledWith({
      name: "New Name",
      protected: true,
    })
  })
})
