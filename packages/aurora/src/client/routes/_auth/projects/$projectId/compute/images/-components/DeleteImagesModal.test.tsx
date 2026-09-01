import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteImagesModal } from "./DeleteImagesModal"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

describe("DeleteImagesModal", () => {
  const mockOnClose = vi.fn()
  const mockOnDelete = vi.fn()
  const mockDeletableImages = ["image-1", "image-2", "image-3"]
  const mockProtectedImages = ["image-4", "image-5"]

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
    protectedImages = [] as Array<string>
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
    mockDeletableImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })
  })

  it("should display protected images section when protectedImages is not empty", () => {
    setup(true, false, mockDeletableImages, mockProtectedImages)
    expect(screen.getByText(/Protected images \(cannot be deleted\):/i)).toBeInTheDocument()
  })

  it("should display all protected image IDs in the protected section", () => {
    setup(true, false, mockDeletableImages, mockProtectedImages)
    mockProtectedImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })
  })

  it("should not display protected images section when protectedImages is empty", () => {
    setup(true, false, mockDeletableImages, [])
    expect(screen.queryByText(/Protected images \(cannot be deleted\):/i)).not.toBeInTheDocument()
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
    expect(mockOnDelete).toHaveBeenCalledWith(mockDeletableImages)
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
    const deletableImgs = ["deletable-1", "deletable-2"]
    const protectedImgs = ["protected-1", "protected-2"]
    setup(true, false, deletableImgs, protectedImgs)
    const confirmInput = screen.getByPlaceholderText("delete")
    await act(async () => {
      fireEvent.change(confirmInput, { target: { value: "delete" } })
    })
    const deleteButton = screen.getByRole("button", { name: /Delete Images/i })
    await act(async () => {
      fireEvent.click(deleteButton)
    })
    expect(mockOnDelete).toHaveBeenCalledWith(deletableImgs)
  })

  it("should render with single image correctly", () => {
    setup(true, false, ["single-image"], [])
    expect(screen.getByText("single-image")).toBeInTheDocument()
  })

  it("should have scrollable container for long image lists", () => {
    const manyImages = Array.from({ length: 20 }, (_, i) => `image-${i}`)
    setup(true, false, manyImages, [])
    const listContainer = screen.getByText("image-0").closest(".overflow-y-auto")
    expect(listContainer).toBeInTheDocument()
    expect(listContainer).toHaveClass("max-h-48")
  })

  it("should mention action cannot be undone in warning message", () => {
    setup(true)
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument()
  })
})
