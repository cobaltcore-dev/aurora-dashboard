import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ActivateImageModal } from "./ActivateImageModal"
import { GlanceImage } from "@/server/Compute/types/image"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

describe("ActivateImageModal", () => {
  const mockOnClose = vi.fn()
  const mockOnActivate = vi.fn()
  const mockImage: GlanceImage = {
    id: "test-id",
    name: "Test Image",
    status: "deactivated",
    visibility: "private",
    disk_format: "qcow2",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    size: 1000,
  } as GlanceImage

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  const setup = (isOpen: boolean, isLoading = false, image = mockImage) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <ActivateImageModal
            isOpen={isOpen}
            isLoading={isLoading}
            onClose={mockOnClose}
            onActivate={mockOnActivate}
            image={image}
          />
        </PortalProvider>
      </I18nProvider>
    )
  }

  it("should render the modal when isOpen is true", () => {
    setup(true)
    expect(screen.getByText("Activate Image")).toBeInTheDocument()
    expect(screen.getByText(/Activating this image will allow/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText("Activate Image")).not.toBeInTheDocument()
  })

  it("should display image details", () => {
    setup(true)
    expect(screen.getByText("Test Image")).toBeInTheDocument()
    expect(screen.getByText("test-id")).toBeInTheDocument()
    expect(screen.getByText("deactivated")).toBeInTheDocument()
    expect(screen.getByText("private")).toBeInTheDocument()
    expect(screen.getByText("qcow2")).toBeInTheDocument()
  })

  it("should show spinner and hide details when isLoading is true", () => {
    setup(true, true)
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
    expect(screen.queryByText("Test Image")).not.toBeInTheDocument()
    expect(screen.queryByText(/Activating this image will allow/i)).not.toBeInTheDocument()
  })

  it("should return null when image is null", () => {
    // @ts-expect-error: Testing null case
    setup(true, false, null)
    expect(screen.queryByText("Activate Image")).not.toBeInTheDocument()
  })
})
