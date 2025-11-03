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
    isDisabled = false,
    deletableImages = mockDeletableImages,
    protectedImages = [] as Array<string>
  ) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <DeleteImagesModal
            isOpen={isOpen}
            isLoading={isLoading}
            isDisabled={isDisabled}
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
    expect(screen.getByText("Delete Images")).toBeInTheDocument()
    expect(screen.getByText(/You are about to delete 3 image\(s\)/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText("Delete Images")).not.toBeInTheDocument()
  })

  it("should display the correct number of deletable images", () => {
    setup(true)
    expect(screen.getByText(/Images to be deleted \(3\)/i)).toBeInTheDocument()
  })

  it("should display all deletable image IDs", () => {
    setup(true)
    mockDeletableImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })
  })

  it("should display protected images section when protectedImages is not empty", () => {
    setup(true, false, false, mockDeletableImages, mockProtectedImages)
    expect(screen.getByText(/Protected images \(cannot be deleted\)/i)).toBeInTheDocument()
  })

  it("should display all protected image IDs in the protected section", () => {
    setup(true, false, false, mockDeletableImages, mockProtectedImages)
    mockProtectedImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })
  })

  it("should not display protected images section when protectedImages is empty", () => {
    setup(true, false, false, mockDeletableImages, [])
    expect(screen.queryByText(/Protected images \(cannot be deleted\)/i)).not.toBeInTheDocument()
  })

  it("should call onClose when the cancel button is clicked", () => {
    setup(true)
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onDelete and onClose when the delete button is clicked", () => {
    setup(true, false, false, mockDeletableImages, mockProtectedImages)
    const deleteButton = screen.getByRole("button", { name: /Delete/i })
    fireEvent.click(deleteButton)
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith(mockDeletableImages)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should disable the delete button when isLoading is true", () => {
    setup(true, true)
    const deleteButton = screen.getByTestId("delete-image-button")
    expect(deleteButton).toBeDisabled()
  })

  it("should disable the delete button when isDisabled is true", () => {
    setup(true, false, true)
    const deleteButton = screen.getByTestId("delete-image-button")
    expect(deleteButton).toBeDisabled()
  })

  it("should show spinner in delete button when isLoading is true", () => {
    setup(true, true)
    const deleteButton = screen.getByTestId("delete-image-button")
    const spinner = deleteButton.querySelector('[role="progressbar"]')
    expect(spinner).toBeInTheDocument()
  })

  it("should show loading spinner overlay when isLoading is true", () => {
    setup(true, true)
    const spinners = screen.getAllByRole("progressbar")
    expect(spinners.length).toBeGreaterThan(0)
  })

  it("should hide image details when isLoading is true", () => {
    setup(true, true)
    expect(screen.queryByText(/Images to be deleted/i)).not.toBeInTheDocument()
    mockDeletableImages.forEach((imageId) => {
      expect(screen.queryByText(imageId)).not.toBeInTheDocument()
    })
  })

  it("should display summary with correct counts", () => {
    setup(true, false, false, mockDeletableImages, mockProtectedImages)
    expect(screen.getByText("Images to delete:")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText(/Protected \(will be skipped\):/i)).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("should display only deletable count in summary when no protected images", () => {
    setup(true, false, false, mockDeletableImages, [])
    expect(screen.getByText("Images to delete:")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.queryByText(/Protected \(will be skipped\):/i)).not.toBeInTheDocument()
  })

  it("should display warning message for deletable images", () => {
    setup(true)
    expect(screen.getByText(/You are about to delete 3 image\(s\)\. This action cannot be undone/i)).toBeInTheDocument()
  })

  it("should display info message about deletion impact", () => {
    setup(true)
    expect(
      screen.getByText(/Deleting images will affect any instances or volumes that depend on them/i)
    ).toBeInTheDocument()
  })

  it("should handle empty deletableImages array", () => {
    setup(true, false, false, [], mockProtectedImages)
    expect(screen.queryByText(/Images to be deleted/i)).not.toBeInTheDocument()
  })

  it("should pass deletableImages to onDelete, not protectedImages", () => {
    const deletableImgs = ["deletable-1", "deletable-2"]
    const protectedImgs = ["protected-1", "protected-2"]
    setup(true, false, false, deletableImgs, protectedImgs)
    const deleteButton = screen.getByRole("button", { name: /Delete/i })
    fireEvent.click(deleteButton)
    expect(mockOnDelete).toHaveBeenCalledWith(deletableImgs)
  })

  it("should render with single image correctly", () => {
    setup(true, false, false, ["single-image"], [])
    expect(screen.getByText(/You are about to delete 1 image\(s\)/i)).toBeInTheDocument()
    expect(screen.getByText("single-image")).toBeInTheDocument()
  })

  it("should have scrollable container for long image lists", () => {
    const manyImages = Array.from({ length: 20 }, (_, i) => `image-${i}`)
    setup(true, false, false, manyImages, [])
    const listContainer = screen.getByText("image-0").closest(".overflow-y-auto")
    expect(listContainer).toBeInTheDocument()
    expect(listContainer).toHaveClass("max-h-24")
  })

  it("should mention action cannot be undone in warning message", () => {
    setup(true)
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument()
  })

  it("should mention ensuring images are no longer in use", () => {
    setup(true)
    expect(screen.getByText(/Ensure these images are no longer in use before proceeding/i)).toBeInTheDocument()
  })

  it("should render button with primary-danger variant", () => {
    setup(true)
    const deleteButton = screen.getByTestId("delete-image-button")
    expect(deleteButton).toBeInTheDocument()
  })

  it("should handle mixed deletable and protected images", () => {
    setup(true, false, false, mockDeletableImages, mockProtectedImages)

    // Check deletable section
    expect(screen.getByText(/Images to be deleted \(3\)/i)).toBeInTheDocument()
    mockDeletableImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })

    // Check protected section
    expect(screen.getByText(/Protected images \(cannot be deleted\)/i)).toBeInTheDocument()
    mockProtectedImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })
  })

  it("should show warning variant for main message", () => {
    setup(true)
    const warningMessage = screen.getByText(/You are about to delete 3 image\(s\)/i).closest(".juno-message")

    expect(warningMessage).toBeInTheDocument()
    expect(warningMessage).toContain(screen.getByTitle("Warning"))
  })

  it("should show info variant for deletion impact message", () => {
    setup(true)
    const infoMessage = screen.getByText(/Deleting images will affect/i).closest(".juno-message")

    expect(infoMessage).toBeInTheDocument()
    expect(infoMessage).toContain(screen.getByTitle("Info"))
  })
})
