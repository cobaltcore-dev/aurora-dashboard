import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ActivateImagesModal } from "./ActivateImagesModal"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

describe("ActivateImagesModal", () => {
  const mockOnClose = vi.fn()
  const mockOnActivate = vi.fn()
  const mockDeactivatedImages = ["image-1", "image-2", "image-3"]
  const mockActiveImages = ["image-4", "image-5"]

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
    deactivatedImages = mockDeactivatedImages,
    activeImages = [] as Array<string>
  ) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <ActivateImagesModal
            isOpen={isOpen}
            isLoading={isLoading}
            isDisabled={isDisabled}
            onClose={mockOnClose}
            onActivate={mockOnActivate}
            deactivatedImages={deactivatedImages}
            activeImages={activeImages}
          />
        </PortalProvider>
      </I18nProvider>
    )
  }

  it("should render the modal when isOpen is true", () => {
    setup(true)
    expect(screen.getByText("Activate Images")).toBeInTheDocument()
    expect(screen.getByText(/You are about to activate 3 image\(s\)/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText("Activate Images")).not.toBeInTheDocument()
  })

  it("should display the correct number of deactivated images", () => {
    setup(true)
    expect(screen.getByText(/Images to be activated \(3\)/i)).toBeInTheDocument()
  })

  it("should display all deactivated image IDs", () => {
    setup(true)
    mockDeactivatedImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })
  })

  it("should display already active images section when activeImages is not empty", () => {
    setup(true, false, false, mockDeactivatedImages, mockActiveImages)
    const headings = screen.getAllByText(/Already active \(will be skipped\)/i)
    expect(headings.length).toBeGreaterThan(0)
    expect(headings[0]).toBeInTheDocument()
  })

  it("should display all active image IDs in the skipped section", () => {
    setup(true, false, false, mockDeactivatedImages, mockActiveImages)
    mockActiveImages.forEach((imageId) => {
      expect(screen.getByText(imageId)).toBeInTheDocument()
    })
  })

  it("should not display already active images section when activeImages is empty", () => {
    setup(true, false, false, mockDeactivatedImages, [])
    expect(screen.queryByText(/Already active \(will be skipped\)/i)).not.toBeInTheDocument()
  })

  it("should call onClose when the cancel button is clicked", () => {
    setup(true)
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onActivate and onClose when the activate button is clicked", () => {
    setup(true, false, false, mockDeactivatedImages, mockActiveImages)
    const activateButton = screen.getByRole("button", { name: /Activate/i })
    fireEvent.click(activateButton)
    expect(mockOnActivate).toHaveBeenCalledTimes(1)
    expect(mockOnActivate).toHaveBeenCalledWith(mockDeactivatedImages)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should disable the activate button when isLoading is true", () => {
    setup(true, true)
    const activateButton = screen.getByTestId("activate-image-button")
    expect(activateButton).toBeDisabled()
  })

  it("should disable the activate button when isDisabled is true", () => {
    setup(true, false, true)
    const activateButton = screen.getByTestId("activate-image-button")
    expect(activateButton).toBeDisabled()
  })

  it("should show spinner in activate button when isLoading is true", () => {
    setup(true, true)
    const activateButton = screen.getByTestId("activate-image-button")
    const spinner = activateButton.querySelector('[role="progressbar"]')
    expect(spinner).toBeInTheDocument()
  })

  it("should show loading spinner overlay when isLoading is true", () => {
    setup(true, true)
    const spinners = screen.getAllByRole("progressbar")
    expect(spinners.length).toBeGreaterThan(0)
  })

  it("should hide image details when isLoading is true", () => {
    setup(true, true)
    expect(screen.queryByText(/Images to be activated/i)).not.toBeInTheDocument()
    mockDeactivatedImages.forEach((imageId) => {
      expect(screen.queryByText(imageId)).not.toBeInTheDocument()
    })
  })

  it("should display summary with correct counts", () => {
    setup(true, false, false, mockDeactivatedImages, mockActiveImages)
    expect(screen.getByText("Images to activate:")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText(/Already active \(will be skipped\):/i)).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("should display only deactivated count in summary when no active images", () => {
    setup(true, false, false, mockDeactivatedImages, [])
    expect(screen.getByText("Images to activate:")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.queryByText(/Already active \(will be skipped\):/i)).not.toBeInTheDocument()
  })

  it("should display warning message for deactivated images", () => {
    setup(true)
    expect(
      screen.getByText(/You are about to activate 3 image\(s\)\. Activated images will be available/i)
    ).toBeInTheDocument()
  })

  it("should display info message about activation", () => {
    setup(true)
    expect(
      screen.getByText(/Activated images will become available for launching new instances and creating volumes/i)
    ).toBeInTheDocument()
  })

  it("should handle empty deactivatedImages array", () => {
    setup(true, false, false, [], mockActiveImages)
    expect(screen.queryByText(/Images to be activated/i)).not.toBeInTheDocument()
  })

  it("should pass deactivatedImgs to onActivate, not deactivatedImages", () => {
    const activeImgs = ["active-1", "active-2"]
    const deactivatedImgs = ["deactivated-1", "deactivated-2"]
    setup(true, false, false, deactivatedImgs, activeImgs)
    const activateButton = screen.getByRole("button", { name: /Activate/i })
    fireEvent.click(activateButton)
    expect(mockOnActivate).toHaveBeenCalledWith(deactivatedImgs)
  })

  it("should render with single image correctly", () => {
    setup(true, false, false, ["single-image"], [])
    expect(screen.getByText(/You are about to activate 1 image\(s\)/i)).toBeInTheDocument()
    expect(screen.getByText("single-image")).toBeInTheDocument()
  })

  it("should have scrollable container for long image lists", () => {
    const manyImages = Array.from({ length: 20 }, (_, i) => `image-${i}`)
    setup(true, false, false, manyImages, [])
    const listContainer = screen.getByText("image-0").closest(".overflow-y-auto")
    expect(listContainer).toBeInTheDocument()
    expect(listContainer).toHaveClass("max-h-24")
  })
})
