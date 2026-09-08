import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeactivateImagesModal } from "./DeactivateImagesModal"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"

describe("DeactivateImagesModal", () => {
  const mockOnClose = vi.fn()
  const mockOnDeactivate = vi.fn()
  const mockActiveImages: GlanceImage[] = [
    { id: "image-1", name: "Image 1", status: "active" } as GlanceImage,
    { id: "image-2", name: "Image 2", status: "active" } as GlanceImage,
    { id: "image-3", name: "Image 3", status: "active" } as GlanceImage,
  ]
  const mockDeactivatedImages: GlanceImage[] = [
    { id: "image-4", name: "Image 4", status: "deactivated" } as GlanceImage,
    { id: "image-5", name: "Image 5", status: "deactivated" } as GlanceImage,
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
    activeImages = mockActiveImages,
    deactivatedImages = [] as Array<GlanceImage>
  ) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <DeactivateImagesModal
            isOpen={isOpen}
            isLoading={isLoading}
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
    expect(screen.getByText(/Deactivate \d+ Images?/i)).toBeInTheDocument()
    expect(screen.getByText(/Deactivated images cannot be used/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText(/Deactivate/i)).not.toBeInTheDocument()
  })

  it("should display all active image names", () => {
    setup(true)
    mockActiveImages.forEach((image) => {
      expect(screen.getByText(image.name!)).toBeInTheDocument()
    })
  })

  it("should display already deactivated images section when deactivatedImages is not empty", () => {
    setup(true, false, mockActiveImages, mockDeactivatedImages)
    expect(screen.getByText(/Already deactivated.*will be skipped/i)).toBeInTheDocument()
  })

  it("should display all deactivated image names in the skipped section", () => {
    setup(true, false, mockActiveImages, mockDeactivatedImages)
    mockDeactivatedImages.forEach((image) => {
      expect(screen.getByText(image.name!)).toBeInTheDocument()
    })
  })

  it("should not display already deactivated images section when deactivatedImages is empty", () => {
    setup(true, false, mockActiveImages, [])
    expect(screen.queryByText(/Already deactivated.*will be skipped/i)).not.toBeInTheDocument()
  })

  it("should call onClose when the cancel button is clicked", () => {
    setup(true)
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onDeactivate with image IDs when the deactivate button is clicked", () => {
    setup(true, false, mockActiveImages, mockDeactivatedImages)
    const deactivateButton = screen.getByRole("button", { name: /Deactivate/i })
    fireEvent.click(deactivateButton)
    expect(mockOnDeactivate).toHaveBeenCalledTimes(1)
    expect(mockOnDeactivate).toHaveBeenCalledWith(mockActiveImages.map((img) => img.id))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should show loading spinner overlay when isLoading is true", () => {
    setup(true, true)
    const spinners = screen.getAllByRole("progressbar")
    expect(spinners.length).toBeGreaterThan(0)
  })

  it("should hide image details when isLoading is true", () => {
    setup(true, true)
    expect(screen.queryByText(/Image to deactivate/i)).not.toBeInTheDocument()
    mockActiveImages.forEach((image) => {
      expect(screen.queryByText(image.name!)).not.toBeInTheDocument()
    })
  })

  it("should handle empty activeImages array", () => {
    setup(true, false, [], mockDeactivatedImages)
    expect(screen.queryByText(/Image to deactivate/i)).not.toBeInTheDocument()
  })

  it("should pass active image IDs to onDeactivate", () => {
    const activeImgs: GlanceImage[] = [
      { id: "active-1", name: "Active 1", status: "active" } as GlanceImage,
      { id: "active-2", name: "Active 2", status: "active" } as GlanceImage,
    ]
    const deactivatedImgs: GlanceImage[] = [
      { id: "deactivated-1", name: "Deactivated 1", status: "deactivated" } as GlanceImage,
      { id: "deactivated-2", name: "Deactivated 2", status: "deactivated" } as GlanceImage,
    ]
    setup(true, false, activeImgs, deactivatedImgs)
    const deactivateButton = screen.getByRole("button", { name: /Deactivate/i })
    fireEvent.click(deactivateButton)
    expect(mockOnDeactivate).toHaveBeenCalledWith(activeImgs.map((img) => img.id))
  })

  it("should render with single image correctly", () => {
    const singleImage: GlanceImage[] = [{ id: "single", name: "Single Image", status: "active" } as GlanceImage]
    setup(true, false, singleImage, [])
    expect(screen.getByText("Single Image")).toBeInTheDocument()
  })

  it("should have scrollable container for long image lists", () => {
    const manyImages: GlanceImage[] = Array.from({ length: 20 }, (_, i) => ({
      id: `image-${i}`,
      name: `Image ${i}`,
      status: "active",
    })) as GlanceImage[]
    setup(true, false, manyImages, [])
    const listContainer = screen.getByText("Image 0").closest(".overflow-y-auto")
    expect(listContainer).toBeInTheDocument()
    expect(listContainer).toHaveClass("max-h-24")
  })
})
