import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeactivateImagesModal } from "./DeactivateImagesModal"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

describe("DeactivateImagesModal", () => {
  const mockOnClose = vi.fn()
  const mockOnDeactivate = vi.fn()
  const mockActiveImages = ["image-1", "image-2", "image-3"]
  const mockDeactivatedImages = ["image-4", "image-5"]

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
    activeImages = mockActiveImages,
    deactivatedImages = [] as Array<string>
  ) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <DeactivateImagesModal
            isOpen={isOpen}
            isLoading={isLoading}
            isDisabled={isDisabled}
            onClose={mockOnClose}
            onDeactivate={mockOnDeactivate}
            activeImages={activeImages}
            deactivatedImages={deactivatedImages}
          />
        </PortalProvider>
      </I18nProvider>
    )
  }

  it("should render the modal when isOpen is true", () => {
    setup(true)
    expect(screen.getByText("Deactivate Images")).toBeInTheDocument()
    expect(screen.getByText(/You are about to deactivate 3 image\(s\)/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText("Deactivate Images")).not.toBeInTheDocument()
  })

  it("should display the correct number of active images", () => {
    setup(true)
    expect(screen.getByText(/Images to be deactivated \(3\)/i)).toBeInTheDocument()
  })

  it("should display all active image IDs", () => {
    setup(true)
    mockActiveImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })
  })

  it("should display already deactivated images section when deactivatedImages is not empty", () => {
    setup(true, false, false, mockActiveImages, mockDeactivatedImages)
    const headings = screen.getAllByText(/Already deactivated \(will be skipped\)/i)
    expect(headings.length).toBeGreaterThan(0)
    expect(headings[0]).toBeInTheDocument()
  })

  it("should display all deactivated image IDs in the skipped section", () => {
    setup(true, false, false, mockActiveImages, mockDeactivatedImages)
    mockDeactivatedImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })
  })

  it("should not display already deactivated images section when deactivatedImages is empty", () => {
    setup(true, false, false, mockActiveImages, [])
    expect(screen.queryByText(/Already deactivated \(will be skipped\)/i)).not.toBeInTheDocument()
  })

  it("should call onClose when the cancel button is clicked", () => {
    setup(true)
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onDeactivate and onClose when the deactivate button is clicked", () => {
    setup(true, false, false, mockActiveImages, mockDeactivatedImages)
    const deactivateButton = screen.getByRole("button", { name: /Deactivate/i })
    fireEvent.click(deactivateButton)
    expect(mockOnDeactivate).toHaveBeenCalledTimes(1)
    expect(mockOnDeactivate).toHaveBeenCalledWith(mockActiveImages)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should disable the deactivate button when isLoading is true", () => {
    setup(true, true)
    const deactivateButton = screen.getByTestId("deactivate-image-button")
    expect(deactivateButton).toBeDisabled()
  })

  it("should disable the deactivate button when isDisabled is true", () => {
    setup(true, false, true)
    const deactivateButton = screen.getByTestId("deactivate-image-button")
    expect(deactivateButton).toBeDisabled()
  })

  it("should show spinner in deactivate button when isLoading is true", () => {
    setup(true, true)
    const deactivateButton = screen.getByTestId("deactivate-image-button")
    const spinner = deactivateButton.querySelector('[role="progressbar"]')
    expect(spinner).toBeInTheDocument()
  })

  it("should show loading spinner overlay when isLoading is true", () => {
    setup(true, true)
    const spinners = screen.getAllByRole("progressbar")
    expect(spinners.length).toBeGreaterThan(0)
  })

  it("should hide image details when isLoading is true", () => {
    setup(true, true)
    expect(screen.queryByText(/Images to be deactivated/i)).not.toBeInTheDocument()
    mockActiveImages.forEach((imageId) => {
      expect(screen.queryByText(imageId)).not.toBeInTheDocument()
    })
  })

  it("should display summary with correct counts", () => {
    setup(true, false, false, mockActiveImages, mockDeactivatedImages)
    expect(screen.getByText("Images to deactivate:")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText(/Already deactivated \(will be skipped\):/i)).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("should display only active count in summary when no deactivated images", () => {
    setup(true, false, false, mockActiveImages, [])
    expect(screen.getByText("Images to deactivate:")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.queryByText(/Already deactivated \(will be skipped\):/i)).not.toBeInTheDocument()
  })

  it("should display warning message for active images", () => {
    setup(true)
    expect(
      screen.getByText(/You are about to deactivate 3 image\(s\)\. Deactivated images cannot be used/i)
    ).toBeInTheDocument()
  })

  it("should display info message about deactivation", () => {
    setup(true)
    expect(
      screen.getByText(/Deactivated images will not be available for launching new instances or creating volumes/i)
    ).toBeInTheDocument()
  })

  it("should handle empty activeImages array", () => {
    setup(true, false, false, [], mockDeactivatedImages)
    expect(screen.queryByText(/Images to be deactivated/i)).not.toBeInTheDocument()
  })

  it("should pass activeImages to onDeactivate, not deactivatedImages", () => {
    const activeImgs = ["active-1", "active-2"]
    const deactivatedImgs = ["deactivated-1", "deactivated-2"]
    setup(true, false, false, activeImgs, deactivatedImgs)
    const deactivateButton = screen.getByRole("button", { name: /Deactivate/i })
    fireEvent.click(deactivateButton)
    expect(mockOnDeactivate).toHaveBeenCalledWith(activeImgs)
  })

  it("should render with single image correctly", () => {
    setup(true, false, false, ["single-image"], [])
    expect(screen.getByText(/You are about to deactivate 1 image\(s\)/i)).toBeInTheDocument()
    expect(screen.getByText("single-image")).toBeInTheDocument()
  })

  it("should have scrollable container for long image lists", () => {
    const manyImages = Array.from({ length: 20 }, (_, i) => `image-${i}`)
    setup(true, false, false, manyImages, [])
    const listContainer = screen.getByText("image-0").closest(".overflow-y-auto")
    expect(listContainer).toBeInTheDocument()
    expect(listContainer).toHaveClass("max-h-24")
  })

  it("should mention existing instances won't be affected in info message", () => {
    setup(true)
    expect(screen.getByText(/Existing instances using these images will not be affected/i)).toBeInTheDocument()
  })

  it("should mention images can be reactivated later in info message", () => {
    setup(true)
    expect(screen.getByText(/You can reactivate images later if needed/i)).toBeInTheDocument()
  })
})
