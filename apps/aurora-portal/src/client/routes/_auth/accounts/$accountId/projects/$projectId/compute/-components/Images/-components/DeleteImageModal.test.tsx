import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteImageModal } from "./DeleteImageModal"
import { GlanceImage } from "@/server/Compute/types/image"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

describe("DeleteImageModal", () => {
  const mockOnClose = vi.fn()
  const mockOnDelete = vi.fn()
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
  }

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
          <DeleteImageModal
            isOpen={isOpen}
            isLoading={isLoading}
            onClose={mockOnClose}
            onDelete={mockOnDelete}
            image={image}
          />
        </PortalProvider>
      </I18nProvider>
    )
  }

  it("should render the modal when isOpen is true", () => {
    setup(true)
    expect(screen.getByText("Delete Image")).toBeInTheDocument()
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument()
  })

  it("should not render the modal when isOpen is false", () => {
    setup(false)
    expect(screen.queryByText("Delete Image")).not.toBeInTheDocument()
  })

  it("should display image details in the modal", () => {
    setup(true)
    expect(screen.getByText("Test Image")).toBeInTheDocument()
    expect(screen.getByText("test-id")).toBeInTheDocument()
    expect(screen.getByText("qcow2")).toBeInTheDocument()
    expect(screen.getByText("Linux")).toBeInTheDocument()
  })

  it("should call onClose when the cancel button is clicked", () => {
    setup(true)
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should call onDelete and onClose when the delete button is clicked", () => {
    setup(true)
    const deleteButton = screen.getByRole("button", { name: /Delete/i })
    fireEvent.click(deleteButton)
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith(mockImage)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should disable the delete button when isLoading is true", () => {
    setup(true, true)
    const deleteButton = screen.getByTestId("delete-image-button")
    expect(deleteButton).toBeDisabled()
  })

  it("should show spinner when isLoading is true", () => {
    setup(true, true)
    const spinners = screen.getAllByRole("progressbar")
    expect(spinners.length).toBeGreaterThan(0)
  })

  it("should return null when image is null", () => {
    setup(
      true,
      false,
      // @ts-expect-error: Argument of type 'null' is not assignable to parameter of type
      null
    )

    expect(screen.queryByText("Delete Image")).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("should display N/A when disk_format is missing", () => {
    const imageWithoutDiskFormat = { ...mockImage, disk_format: undefined }
    setup(true, false, imageWithoutDiskFormat)
    expect(screen.getByText("N/A")).toBeInTheDocument()
  })

  it("should not display OS Type row when os_type is missing", () => {
    const imageWithoutOsType = { ...mockImage, os_type: undefined }
    setup(true, false, imageWithoutOsType)
    expect(screen.queryByText("OS Type")).not.toBeInTheDocument()
  })

  it("should format the created date correctly", () => {
    setup(true)
    // The exact format depends on locale, but it should contain date parts
    const dateCell = screen.getByText(/1\/1\/2023|2023/).closest("div")
    expect(dateCell).toBeInTheDocument()
  })
})
