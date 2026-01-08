import { describe, test, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import userEvent from "@testing-library/user-event"
import { CreateImageModal } from "./CreateImageModal"

const renderImageModal = (isOpen = true, onClose = vi.fn(), onCreate = vi.fn()) => {
  return render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CreateImageModal isOpen={isOpen} onClose={onClose} onCreate={onCreate} />
      </PortalProvider>
    </I18nProvider>
  )
}

const createMockFile = (name: string = "test-image.qcow2", type: string = "application/octet-stream"): File => {
  const blob = new Blob(["test content"], { type })
  return new File([blob], name, { type })
}

describe("CreateImageModal", () => {
  const mockOnCreate = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(async () => {
    vi.resetAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Modal Visibility", () => {
    test("should not render modal when isOpen is false", () => {
      const { container } = renderImageModal(false, mockOnClose, mockOnCreate)
      const modal = container.querySelector("[role='dialog']")
      expect(modal).not.toBeInTheDocument()
    })

    test("should render modal when isOpen is true", () => {
      const { container } = renderImageModal(true, mockOnClose, mockOnCreate)
      const modal = container.querySelector("[role='dialog']")
      expect(modal).toBeInTheDocument()
    })

    test("should display Create New Image title", () => {
      renderImageModal(true, mockOnClose, mockOnCreate)
      expect(screen.getByText("Create New Image")).toBeInTheDocument()
    })
  })

  describe("Form Fields Rendering", () => {
    test("should render all required form fields", () => {
      renderImageModal(true, mockOnClose, mockOnCreate)

      expect(screen.getByText("Image File")).toBeInTheDocument()
      expect(screen.getByLabelText(/^Image Name$/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Tags$/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Visibility$/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Disk Format$/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Container Format$/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Protected$/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^OS Type$/)).toBeInTheDocument()
      expect(screen.getByLabelText(/^OS Distribution$/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Min Disk/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Min RAM/)).toBeInTheDocument()
    })

    test("should have Create Image and Cancel buttons", () => {
      renderImageModal(true, mockOnClose, mockOnCreate)
      expect(screen.getByText("Create Image")).toBeInTheDocument()
      expect(screen.getByText("Cancel")).toBeInTheDocument()
    })
  })

  describe("Form Input Handling", () => {
    test("should update image name input", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const nameInput = screen.getByLabelText(/^Image Name$/) as HTMLInputElement
      await user.type(nameInput, "Ubuntu 22.04")

      expect(nameInput.value).toBe("Ubuntu 22.04")
    })

    test("should allow adding tags", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const tagsInput = screen.getByLabelText(/^Tags$/) as HTMLInputElement
      const addButton = screen.getByText("Add")

      await user.type(tagsInput, "production")
      await user.click(addButton)

      expect(screen.getByText("production")).toBeInTheDocument()
      expect(tagsInput.value).toBe("")
    })

    test("should allow adding multiple tags", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const tagsInput = screen.getByLabelText(/^Tags$/) as HTMLInputElement
      const addButton = screen.getByText("Add")

      await user.type(tagsInput, "production")
      await user.click(addButton)

      await user.type(tagsInput, "linux")
      await user.click(addButton)

      expect(screen.getByText("production")).toBeInTheDocument()
      expect(screen.getByText("linux")).toBeInTheDocument()
    })

    test("should not add duplicate tags", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

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

    test("should add tag on Enter key press", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const tagsInput = screen.getByLabelText(/^Tags$/) as HTMLInputElement

      await user.type(tagsInput, "production{Enter}")

      expect(screen.getByText("production")).toBeInTheDocument()
    })

    test("should update visibility selection", async () => {
      renderImageModal(true, mockOnClose, mockOnCreate)

      const visibilitySelect = screen.getByLabelText("Visibility")
      await act(async () => {
        fireEvent.change(visibilitySelect, { target: { value: "public" } })
      })

      expect((visibilitySelect as HTMLSelectElement).value).toBe("public")
    })

    test("should update min disk and min ram values", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const minDiskInput = screen.getByLabelText(/Min Disk/) as HTMLInputElement
      const minRamInput = screen.getByLabelText(/Min RAM/) as HTMLInputElement

      await user.clear(minDiskInput)
      await user.type(minDiskInput, "20")

      await user.clear(minRamInput)
      await user.type(minRamInput, "2048")

      expect(minDiskInput.value).toBe("20")
      expect(minRamInput.value).toBe("2048")
    })

    test("should update protected checkbox", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const protectedCheckbox = screen.getByLabelText(/^Protected$/) as HTMLInputElement

      expect(protectedCheckbox.checked).toBe(false)

      await user.click(protectedCheckbox)

      expect(protectedCheckbox.checked).toBe(true)
    })
  })

  describe("Disk Format and Container Format Integration", () => {
    test("should disable container_format until disk_format is selected", () => {
      renderImageModal(true, mockOnClose, mockOnCreate)

      const containerFormatSelect = screen.getByLabelText(/^Container Format$/) as HTMLSelectElement
      expect(containerFormatSelect.disabled).toBe(true)
    })

    test("should enable container_format when disk_format is selected", async () => {
      const user = userEvent.setup()
      const { container } = renderImageModal(true, mockOnClose, mockOnCreate)

      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)

      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))

      const containerFormatSelect = container.querySelector("input[name=container_format]") as HTMLInputElement
      await waitFor(() => {
        expect(containerFormatSelect.disabled).toBe(false)
      })
    })

    test("should auto-select default container_format when disk_format changes", async () => {
      const user = userEvent.setup()
      const { container } = renderImageModal(true, mockOnClose, mockOnCreate)

      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)

      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))

      const containerFormatSelect = container.querySelector("input[name=container_format]") as HTMLInputElement

      await waitFor(() => {
        expect(containerFormatSelect.value).toBe("bare")
      })
    })

    test("should show only compatible container formats for qcow2", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)

      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))

      const containerFormatSelect = screen.getByLabelText(/^Container Format$/) as HTMLSelectElement

      await user.click(containerFormatSelect)

      await waitFor(() => {
        // Verify container format dropdown displays only compatible formats for qcow2
        // and that BARE is auto-selected as the default
        expect(screen.getAllByText(/bare/i)).toHaveLength(2)
        expect(screen.getByText(/ova/i)).toBeInTheDocument()
        expect(screen.getByText(/docker/i)).toBeInTheDocument()
      })
    })
  })

  describe("File Upload", () => {
    test("should accept file selection", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const file = createMockFile("test-image.qcow2")
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText("test-image.qcow2")).toBeInTheDocument()
      })
    })

    test("should allow file removal", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const file = createMockFile("test-image.qcow2")
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText("test-image.qcow2")).toBeInTheDocument()
      })

      const removeButton = screen.getByText("Remove")
      await user.click(removeButton)

      expect(screen.queryByText("test-image.qcow2")).not.toBeInTheDocument()
    })
  })

  describe("Form Validation", () => {
    test("should require image name", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const file = createMockFile()
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)

      await user.upload(fileInput, file)
      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))

      const createButton = screen.getByText("Create Image")
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText("Image name is required")).toBeInTheDocument()
      })
    })

    test("should require image file", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const nameInput = screen.getByLabelText(/^Image Name$/)
      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)

      await user.type(nameInput, "Test Image")
      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))

      const createButton = screen.getByText("Create Image")
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText("Image file is required")).toBeInTheDocument()
      })
    })

    test("should require disk format", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const file = createMockFile()
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const nameInput = screen.getByLabelText(/^Image Name$/)

      await user.upload(fileInput, file)
      await user.type(nameInput, "Test Image")

      const createButton = screen.getByText("Create Image")
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText("Disk format is required")).toBeInTheDocument()
      })
    })

    test("should reject negative min_disk", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const file = createMockFile()
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const nameInput = screen.getByLabelText(/^Image Name$/)
      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)
      const minDiskInput = screen.getByLabelText(/Min Disk/) as HTMLInputElement

      await user.upload(fileInput, file)
      await user.type(nameInput, "Test Image")
      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))
      await user.clear(minDiskInput)
      await user.type(minDiskInput, "-5")

      const createButton = screen.getByText("Create Image")
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText("Minimum disk must be 0 or greater")).toBeInTheDocument()
      })
    })

    test("should reject negative min_ram", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const file = createMockFile()
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const nameInput = screen.getByLabelText(/^Image Name$/)
      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)
      const minRamInput = screen.getByLabelText(/Min RAM/) as HTMLInputElement

      await user.upload(fileInput, file)
      await user.type(nameInput, "Test Image")
      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))
      await user.clear(minRamInput)
      await user.type(minRamInput, "-512")

      const createButton = screen.getByText("Create Image")
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText("Minimum RAM must be 0 or greater")).toBeInTheDocument()
      })
    })
  })

  describe("Form Submission", () => {
    test("should successfully submit valid form", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const file = createMockFile()
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const nameInput = screen.getByLabelText(/^Image Name$/)
      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)

      await user.upload(fileInput, file)
      await user.type(nameInput, "Ubuntu 22.04")
      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))

      const createButton = screen.getByText("Create Image")
      await user.click(createButton)

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Ubuntu 22.04",
            disk_format: "qcow2",
            container_format: "bare",
          }),
          file
        )
      })
    })

    test("should include all form data in submission", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const file = createMockFile()
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const nameInput = screen.getByLabelText(/^Image Name$/)
      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)
      const visibilitySelect = screen.getByLabelText(/^Visibility$/)
      const protectedCheckbox = screen.getByLabelText(/^Protected$/) as HTMLInputElement
      const minDiskInput = screen.getByLabelText(/Min Disk/) as HTMLInputElement
      const minRamInput = screen.getByLabelText(/Min RAM/) as HTMLInputElement
      const osTypeInput = screen.getByLabelText(/^OS Type$/)
      const osDistroInput = screen.getByLabelText(/^OS Distribution$/)

      await user.upload(fileInput, file)
      await user.type(nameInput, "Test Image")
      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))
      await user.click(visibilitySelect)
      await user.click(screen.getByText(/public/i))
      await user.click(protectedCheckbox)
      await user.clear(minDiskInput)
      await user.type(minDiskInput, "20")
      await user.clear(minRamInput)
      await user.type(minRamInput, "2048")
      await user.type(osTypeInput, "Linux")
      await user.type(osDistroInput, "Ubuntu")

      const createButton = screen.getByText("Create Image")
      await user.click(createButton)

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Test Image",
            disk_format: "qcow2",
            container_format: "bare",
            visibility: "public",
            protected: true,
            min_disk: 20,
            min_ram: 2048,
            os_type: "Linux",
            os_distro: "Ubuntu",
          }),
          file
        )
      })
    })

    test("should close modal after successful submission", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const file = createMockFile()
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const nameInput = screen.getByLabelText(/^Image Name$/)
      const diskFormatSelect = screen.getByLabelText(/^Disk Format$/)

      await user.upload(fileInput, file)
      await user.type(nameInput, "Test Image")
      await user.click(diskFormatSelect)
      await user.click(screen.getByText(/qcow2 - qemu emulator/i))

      const createButton = screen.getByText("Create Image")
      await user.click(createButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe("Modal Actions", () => {
    test("should close modal when Cancel button is clicked", async () => {
      const user = userEvent.setup()
      renderImageModal(true, mockOnClose, mockOnCreate)

      const cancelButton = screen.getByText("Cancel")
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    test("should display spinner while loading", async () => {
      await act(async () => {
        render(
          <I18nProvider i18n={i18n}>
            <PortalProvider>
              <CreateImageModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} isLoading={true} />
            </PortalProvider>
          </I18nProvider>
        )
      })

      const spinners = screen.getAllByRole("progressbar")
      expect(spinners.length).toBeGreaterThan(0)
    })
  })
})
