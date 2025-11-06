import { describe, test, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react"
import { EditImageMetadataModal } from "./EditImageMetadataModal"
import { GlanceImage } from "@/server/Compute/types/image"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"

const renderMetadataModal = (
  isOpen = true,
  mockOnClose = vi.fn(),
  mockImage: GlanceImage,
  mockOnSave = vi.fn(),
  isLoading = false
) => {
  return render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EditImageMetadataModal
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

describe("EditImageMetadataModal", () => {
  // Mock image with both excluded and custom properties
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
    tags: ["production"],
    protected: false,
    min_disk: 10,
    min_ram: 512,
    // Custom metadata that should be editable
    os_version: "22.04",
    architecture: "x86_64",
    app_version: "1.2.3",
  } as GlanceImage

  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(async () => {
    vi.resetAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  test("renders when isOpen is true", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    await waitFor(() => {
      expect(screen.getByText("Edit Image Metadata")).toBeDefined()
    })
  })

  test("does not render when isOpen is false", () => {
    renderMetadataModal(false, mockOnClose, mockImage, mockOnSave)

    expect(screen.queryByText("Edit Image Metadata")).toBeNull()
  })

  test("displays custom metadata properties and excludes system properties", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    await waitFor(() => {
      // Should display custom properties
      expect(screen.getByText("os_version")).toBeInTheDocument()
      expect(screen.getByText("22.04")).toBeInTheDocument()
      expect(screen.getByText("architecture")).toBeInTheDocument()
      expect(screen.getByText("x86_64")).toBeInTheDocument()
      expect(screen.getByText("app_version")).toBeInTheDocument()
      expect(screen.getByText("1.2.3")).toBeInTheDocument()

      // Should NOT display excluded properties
      expect(screen.queryByText("name")).not.toBeInTheDocument()
      expect(screen.queryByText("status")).not.toBeInTheDocument()
      expect(screen.queryByText("disk_format")).not.toBeInTheDocument()
    })
  })

  test("shows empty state when no custom metadata exists", async () => {
    const emptyImage = {
      id: "test-id",
      name: "Test Image",
      status: "active",
      visibility: "private",
    } as GlanceImage

    renderMetadataModal(true, mockOnClose, emptyImage, mockOnSave)

    await waitFor(() => {
      expect(screen.getByText(/No custom metadata properties found/i)).toBeInTheDocument()
    })
  })

  test("opens add property form when Add Property button is clicked", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText("property_key")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Value")).toBeInTheDocument()
    })
  })

  test("adds new property successfully", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    // Click Add Property
    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    // Fill in new property
    const keyInput = screen.getByPlaceholderText("property_key")
    const valueInput = screen.getByPlaceholderText("Value")

    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "environment" } })
      fireEvent.change(valueInput, { target: { value: "production" } })
    })

    // Click save on the new row
    const saveButtons = screen.getAllByTitle("Save")
    await act(async () => {
      fireEvent.click(saveButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText("environment")).toBeInTheDocument()
      expect(screen.getByText("production")).toBeInTheDocument()
    })
  })

  test("validates required key when adding property", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    // Try to save without entering key
    const valueInput = screen.getByPlaceholderText("Value")
    await act(async () => {
      fireEvent.change(valueInput, { target: { value: "test" } })
    })

    const saveButtons = screen.getAllByTitle("Save")
    await act(async () => {
      fireEvent.click(saveButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText("Key is required")).toBeInTheDocument()
    })
  })

  test("validates required value when adding property", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    // Enter key but not value
    const keyInput = screen.getByPlaceholderText("property_key")
    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "test_key" } })
    })

    const saveButtons = screen.getAllByTitle("Save")
    await act(async () => {
      fireEvent.click(saveButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText("Value is required")).toBeInTheDocument()
    })
  })

  test("prevents adding reserved property names", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("property_key")
    const valueInput = screen.getByPlaceholderText("Value")

    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "name" } })
      fireEvent.change(valueInput, { target: { value: "test" } })
    })

    const saveButtons = screen.getAllByTitle("Save")
    await act(async () => {
      fireEvent.click(saveButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText("This property is reserved and cannot be modified")).toBeInTheDocument()
    })
  })

  test("prevents duplicate property keys", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("property_key")
    const valueInput = screen.getByPlaceholderText("Value")

    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "os_version" } })
      fireEvent.change(valueInput, { target: { value: "test" } })
    })

    const saveButtons = screen.getAllByTitle("Save")
    await act(async () => {
      fireEvent.click(saveButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText("A property with this key already exists")).toBeInTheDocument()
    })
  })

  test("cancels adding new property", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("property_key")
    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "test_key" } })
    })

    const cancelButtons = screen.getAllByTitle("Discard")
    await act(async () => {
      fireEvent.click(cancelButtons[0])
    })

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("property_key")).not.toBeInTheDocument()
    })
  })

  test("edits existing property", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    // Click edit button for os_version
    const editButton = screen.getByTestId("edit-os_version")
    await act(async () => {
      fireEvent.click(editButton)
    })

    // Find the input field (should contain current value)
    const input = screen.getByDisplayValue("22.04")
    await act(async () => {
      fireEvent.change(input, { target: { value: "24.04" } })
    })

    // Save the edit
    const saveButtons = screen.getAllByTitle("Save")
    await act(async () => {
      fireEvent.click(saveButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText("24.04")).toBeInTheDocument()
      expect(screen.queryByText("22.04")).not.toBeInTheDocument()
    })
  })

  test("cancels editing property and restores original value", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const editButton = screen.getByTestId("edit-os_version")
    await act(async () => {
      fireEvent.click(editButton)
    })

    const input = screen.getByDisplayValue("22.04")
    await act(async () => {
      fireEvent.change(input, { target: { value: "changed" } })
    })

    const cancelButton = screen.getByRole("button", { name: /discard/i })
    await act(async () => {
      fireEvent.click(cancelButton)
    })

    await waitFor(() => {
      expect(screen.getByText("22.04")).toBeInTheDocument()
      expect(screen.queryByDisplayValue("changed")).not.toBeInTheDocument()
    })
  })

  test("deletes property", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    // Verify property exists
    expect(screen.getByText("os_version")).toBeInTheDocument()

    const deleteButton = screen.getByTestId("delete-os_version")
    await act(async () => {
      fireEvent.click(deleteButton)
    })

    await waitFor(() => {
      expect(screen.queryByText("os_version")).not.toBeInTheDocument()
    })
  })

  test("disables Add Property button when editing", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const editButtons = screen.getAllByTitle("Edit")
    await act(async () => {
      fireEvent.click(editButtons[0])
    })

    const addButton = screen.getByRole("button", { name: /add property/i })
    expect(addButton).toBeDisabled()
  })

  test("disables edit and delete buttons when adding new property", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    const editButtons = screen.getAllByRole("button", { name: /edit/i })
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i })

    editButtons.forEach((button) => {
      expect(button).toBeDisabled()
    })

    deleteButtons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  test("calls onSave with metadata object when Save Changes is clicked", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const saveButton = screen.getByTestId("save-metadata-button")
    await act(async () => {
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
      expect(mockOnSave).toHaveBeenCalledWith({
        os_distro: "Ubuntu",
        os_type: "Linux",
        os_version: "22.04",
        architecture: "x86_64",
        app_version: "1.2.3",
      })
    })
  })

  test("calls onClose when Cancel button is clicked", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const cancelButton = screen.getByText("Cancel")
    await act(async () => {
      fireEvent.click(cancelButton)
    })

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test("disables Save Changes button when editing or adding", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const saveButton = screen.getByTestId("save-metadata-button")
    expect(saveButton).not.toBeDisabled()

    // Start editing
    const editButtons = screen.getAllByTitle("Edit")
    await act(async () => {
      fireEvent.click(editButtons[0])
    })

    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })
  })

  test("shows loading spinner when isLoading is true", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave, true)

    await waitFor(() => {
      const spinners = screen.getAllByRole("progressbar")
      expect(spinners.length).toBeGreaterThan(0)
    })
  })

  test("disables buttons when isLoading is true", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave, true)

    await waitFor(() => {
      const saveButton = screen.getByTestId("save-metadata-button")
      const cancelButton = screen.getByText("Cancel")

      expect(saveButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })
  })

  test("displays info message about custom metadata", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    await waitFor(() => {
      expect(
        screen.getByText(/Custom metadata properties can be used to store additional information/i)
      ).toBeInTheDocument()
    })
  })

  test("displays warning message when metadata exists", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    await waitFor(() => {
      expect(screen.getByText(/Changes to metadata will be saved when you click/i)).toBeInTheDocument()
    })
  })

  test("does not display warning message when no metadata exists", async () => {
    const emptyImage = {
      id: "test-id",
      name: "Test Image",
      status: "active",
    } as GlanceImage

    renderMetadataModal(true, mockOnClose, emptyImage, mockOnSave)

    await waitFor(() => {
      expect(screen.queryByText(/Changes to metadata will be saved when you click/i)).not.toBeInTheDocument()
    })
  })

  test("resets form when modal is closed", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    // Start adding new property
    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("property_key")
    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "test" } })
    })

    // Close modal
    const cancelButton = screen.getByText("Cancel")

    await act(async () => {
      fireEvent.click(cancelButton)
    })

    expect(mockOnClose).toHaveBeenCalled()
  })

  test("trims whitespace from key and value when saving", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    const keyInput = screen.getByPlaceholderText("property_key")
    const valueInput = screen.getByPlaceholderText("Value")

    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "  trimmed_key  " } })
      fireEvent.change(valueInput, { target: { value: "  trimmed_value  " } })
    })

    const saveButtons = screen.getAllByTitle("Save")
    await act(async () => {
      fireEvent.click(saveButtons[0])
    })

    await waitFor(() => {
      expect(screen.getByText("trimmed_key")).toBeInTheDocument()
      expect(screen.getByText("trimmed_value")).toBeInTheDocument()
    })
  })

  test("displays property key with title attribute for tooltip", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    await waitFor(() => {
      const keyElement = screen.getByText("os_version")
      expect(keyElement).toHaveAttribute("title", "os_version")
    })
  })

  test("displays property value with title attribute for tooltip", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    await waitFor(() => {
      const valueElement = screen.getByText("22.04")
      expect(valueElement).toHaveAttribute("title", "22.04")
    })
  })

  test("clears errors when correcting validation issues", async () => {
    renderMetadataModal(true, mockOnClose, mockImage, mockOnSave)

    const addButton = screen.getByRole("button", { name: /add property/i })
    await act(async () => {
      fireEvent.click(addButton)
    })

    // Try to save without value
    const keyInput = screen.getByPlaceholderText("property_key")
    await act(async () => {
      fireEvent.change(keyInput, { target: { value: "test_key" } })
    })

    const saveButtons = screen.getAllByTitle("Save")
    await act(async () => {
      fireEvent.click(saveButtons[0])
    })

    // Error should appear
    await waitFor(() => {
      expect(screen.getByText("Value is required")).toBeInTheDocument()
    })

    // Now add value - error should clear
    const valueInput = screen.getByPlaceholderText("Value")
    await act(async () => {
      fireEvent.change(valueInput, { target: { value: "test_value" } })
    })

    await waitFor(() => {
      expect(screen.queryByText("Value is required")).not.toBeInTheDocument()
    })
  })
})
