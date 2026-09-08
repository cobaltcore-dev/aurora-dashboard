import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteImagesModal } from "./DeleteImagesModal"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"

describe("DeleteImagesModal", () => {
  const mockOnClose = vi.fn()
  const mockOnDelete = vi.fn()
  const mockDeletableImages: GlanceImage[] = [
    { id: "image-1", name: "Ubuntu 22.04", protected: false } as GlanceImage,
    { id: "image-2", name: "Debian 12", protected: false } as GlanceImage,
    { id: "image-3", name: "Fedora 39", protected: false } as GlanceImage,
  ]
  const mockProtectedImages: GlanceImage[] = [
    { id: "image-4", name: "Windows Server 2022", protected: true } as GlanceImage,
    { id: "image-5", name: "RHEL 9", protected: true } as GlanceImage,
  ]

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  const setup = (
    isOpen: boolean,
    isLoading = false,
    deletableImages = mockDeletableImages,
    protectedImages = [] as Array<GlanceImage>
  ) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <DeleteImagesModal
            isOpen={isOpen}
            isLoading={isLoading}
            onClose={mockOnClose}
            onDelete={mockOnDelete}
            deletableImages={deletableImages}
            protectedImages={protectedImages}
          />
        </PortalProvider>
      </I18nProvider>
    )
  }

  it("should render the modal when isOpen is true", () => {
    setup(true)
    expect(screen.getByText(/Delete \d+ Images?/i)).toBeInTheDocument()
    expect(screen.getByText(/The selected images will be permanently deleted/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText(/Delete \d+ Images?/i)).not.toBeInTheDocument()
  })

  it("should display the correct label for images to delete", () => {
    setup(true)
    expect(screen.getByText(/Images to delete:/i)).toBeInTheDocument()
  })

  it("should display all deletable image IDs", () => {
    setup(true)
    mockDeletableImages.forEach((image) => {
      expect(screen.getByText(image.name!)).toBeInTheDocument()
    })
  })

  it("should display protected images section when protectedImages is not empty", () => {
    setup(true, false, mockDeletableImages, mockProtectedImages)
    expect(screen.getByText(/Images Protected from Deletion/i)).toBeInTheDocument()
  })

  it("should display all protected image IDs in the protected section", () => {
    setup(true, false, mockDeletableImages, mockProtectedImages)
    mockProtectedImages.forEach((image) => {
      expect(screen.getByText(image.name!)).toBeInTheDocument()
    })
  })

  it("should not display protected images section when protectedImages is empty", () => {
    setup(true, false, mockDeletableImages, [])
    expect(screen.queryByText(/Images Protected from Deletion/i)).not.toBeInTheDocument()
  })

  it("should call onClose when the cancel button is clicked", () => {
    setup(true)
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onDelete when delete button is clicked with correct confirmation", async () => {
    setup(true, false, mockDeletableImages, mockProtectedImages)
    const confirmInput = screen.getByPlaceholderText("delete")
    await act(async () => {
      fireEvent.change(confirmInput, { target: { value: "delete" } })
    })
    const deleteButton = screen.getByRole("button", { name: /Delete Images/i })
    await act(async () => {
      fireEvent.click(deleteButton)
    })
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith(mockDeletableImages.map((img) => img.id))
  })

  it("should disable delete button when confirmation text is not entered", () => {
    setup(true)
    const deleteButton = screen.getByRole("button", { name: /Delete Images/i })
    expect(deleteButton).toBeDisabled()
  })

  it("should enable delete button when confirmation text matches", () => {
    setup(true)
    const confirmInput = screen.getByPlaceholderText("delete")
    fireEvent.change(confirmInput, { target: { value: "delete" } })
    const deleteButton = screen.getByRole("button", { name: /Delete Images/i })
    expect(deleteButton).not.toBeDisabled()
  })

  it("should disable the delete button when isLoading is true", () => {
    setup(true, true)
    const confirmInput = screen.getByPlaceholderText("delete")
    fireEvent.change(confirmInput, { target: { value: "delete" } })
    const deleteButton = screen.getByRole("button", { name: /Deleting.../i })
    expect(deleteButton).toBeDisabled()
  })

  it("should show 'Deleting...' text when isLoading is true", () => {
    setup(true, true)
    expect(screen.getByText("Deleting...")).toBeInTheDocument()
  })

  it("should pass deletableImages to onDelete, not protectedImages", async () => {
    const deletableImgs: GlanceImage[] = [
      { id: "deletable-1", name: "Deletable 1", protected: false } as GlanceImage,
      { id: "deletable-2", name: "Deletable 2", protected: false } as GlanceImage,
    ]
    const protectedImgs: GlanceImage[] = [
      { id: "protected-1", name: "Protected 1", protected: true } as GlanceImage,
      { id: "protected-2", name: "Protected 2", protected: true } as GlanceImage,
    ]
    setup(true, false, deletableImgs, protectedImgs)
    const confirmInput = screen.getByPlaceholderText("delete")
    await act(async () => {
      fireEvent.change(confirmInput, { target: { value: "delete" } })
    })
    const deleteButton = screen.getByRole("button", { name: /Delete Images/i })
    await act(async () => {
      fireEvent.click(deleteButton)
    })
    expect(mockOnDelete).toHaveBeenCalledWith(deletableImgs.map((img) => img.id))
  })

  it("should render with single image correctly", () => {
    const singleImage: GlanceImage[] = [{ id: "single-image", name: "Single Image", protected: false } as GlanceImage]
    setup(true, false, singleImage, [])
    expect(screen.getByText("Single Image")).toBeInTheDocument()
  })

  it("should have scrollable container for long image lists", () => {
    const manyImages: GlanceImage[] = Array.from({ length: 20 }, (_, i) => ({
      id: `image-${i}`,
      name: `Image ${i}`,
      protected: false,
    })) as GlanceImage[]
    setup(true, false, manyImages, [])
    const listContainer = screen.getByText("Image 0").closest(".overflow-y-auto")
    expect(listContainer).toBeInTheDocument()
    expect(listContainer).toHaveClass("max-h-48")
  })

  it("should mention action cannot be undone in warning message", () => {
    setup(true)
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument()
  })
})
