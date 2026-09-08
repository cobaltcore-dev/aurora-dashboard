import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ActivateImagesModal } from "./ActivateImagesModal"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"

describe("ActivateImagesModal", () => {
  const mockOnClose = vi.fn()
  const mockOnActivate = vi.fn()
  const mockDeactivatedImages: GlanceImage[] = [
    { id: "image-1", name: "Image 1", status: "deactivated" } as GlanceImage,
    { id: "image-2", name: "Image 2", status: "deactivated" } as GlanceImage,
    { id: "image-3", name: "Image 3", status: "deactivated" } as GlanceImage,
  ]
  const mockActiveImages: GlanceImage[] = [
    { id: "image-4", name: "Image 4", status: "active" } as GlanceImage,
    { id: "image-5", name: "Image 5", status: "active" } as GlanceImage,
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
    deactivatedImages = mockDeactivatedImages,
    activeImages = [] as Array<GlanceImage>
  ) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <ActivateImagesModal
            isOpen={isOpen}
            isLoading={isLoading}
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
    expect(screen.getByText(/Activate \d+ Images?/i)).toBeInTheDocument()
    expect(screen.getByText(/Activated images will be available/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText(/Activate/i)).not.toBeInTheDocument()
  })

  it("should display the correct number of deactivated images", () => {
    setup(true)
    expect(screen.getByText(/Image to activate/i)).toBeInTheDocument()
  })

  it("should display all deactivated image names", () => {
    setup(true)
    mockDeactivatedImages.forEach((image) => {
      expect(screen.getByText(image.name!)).toBeInTheDocument()
    })
  })

  it("should display already active images section when activeImages is not empty", () => {
    setup(true, false, mockDeactivatedImages, mockActiveImages)
    expect(screen.getByText(/Already active.*will be skipped/i)).toBeInTheDocument()
  })

  it("should display all active image names in the skipped section", () => {
    setup(true, false, mockDeactivatedImages, mockActiveImages)
    mockActiveImages.forEach((image) => {
      expect(screen.getByText(image.name!)).toBeInTheDocument()
    })
  })

  it("should not display already active images section when activeImages is empty", () => {
    setup(true, false, mockDeactivatedImages, [])
    expect(screen.queryByText(/Already active.*will be skipped/i)).not.toBeInTheDocument()
  })

  it("should call onClose when the cancel button is clicked", () => {
    setup(true)
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onActivate with image IDs when the activate button is clicked", () => {
    setup(true, false, mockDeactivatedImages, mockActiveImages)
    const activateButton = screen.getByRole("button", { name: /Activate/i })
    fireEvent.click(activateButton)
    expect(mockOnActivate).toHaveBeenCalledTimes(1)
    expect(mockOnActivate).toHaveBeenCalledWith(mockDeactivatedImages.map((img) => img.id))
  })

  it("should show loading spinner overlay when isLoading is true", () => {
    setup(true, true)
    const spinners = screen.getAllByRole("progressbar")
    expect(spinners.length).toBeGreaterThan(0)
  })

  it("should hide image details when isLoading is true", () => {
    setup(true, true)
    expect(screen.queryByText(/Image to activate/i)).not.toBeInTheDocument()
    mockDeactivatedImages.forEach((image) => {
      expect(screen.queryByText(image.name!)).not.toBeInTheDocument()
    })
  })

  it("should handle empty deactivatedImages array", () => {
    setup(true, false, [], mockActiveImages)
    expect(screen.queryByText(/Image to activate/i)).not.toBeInTheDocument()
  })

  it("should pass deactivated image IDs to onActivate", () => {
    const activeImgs: GlanceImage[] = [
      { id: "active-1", name: "Active 1", status: "active" } as GlanceImage,
      { id: "active-2", name: "Active 2", status: "active" } as GlanceImage,
    ]
    const deactivatedImgs: GlanceImage[] = [
      { id: "deactivated-1", name: "Deactivated 1", status: "deactivated" } as GlanceImage,
      { id: "deactivated-2", name: "Deactivated 2", status: "deactivated" } as GlanceImage,
    ]
    setup(true, false, deactivatedImgs, activeImgs)
    const activateButton = screen.getByRole("button", { name: /Activate/i })
    fireEvent.click(activateButton)
    expect(mockOnActivate).toHaveBeenCalledWith(deactivatedImgs.map((img) => img.id))
  })

  it("should render with single image correctly", () => {
    const singleImage: GlanceImage[] = [
      { id: "single-image", name: "Single Image", status: "deactivated" } as GlanceImage,
    ]
    setup(true, false, singleImage, [])
    expect(screen.getByText("Single Image")).toBeInTheDocument()
  })

  it("should have scrollable container for long image lists", () => {
    const manyImages: GlanceImage[] = Array.from({ length: 20 }, (_, i) => ({
      id: `image-${i}`,
      name: `Image ${i}`,
      status: "deactivated",
    })) as GlanceImage[]
    setup(true, false, manyImages, [])
    const listContainer = screen.getByText("Image 0").closest(".overflow-y-auto")
    expect(listContainer).toBeInTheDocument()
    expect(listContainer).toHaveClass("max-h-24")
  })
})
