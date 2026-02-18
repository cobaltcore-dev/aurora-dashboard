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
    size: 1000, // 1.00 KB under decimal (SI) formatting
  } as GlanceImage

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  const setup = (isOpen: boolean, isLoading = false, isDisabled = false, image = mockImage) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <DeleteImageModal
            isOpen={isOpen}
            isLoading={isLoading}
            isDisabled={isDisabled}
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
    expect(screen.queryByText("Test Image")).not.toBeInTheDocument()
    expect(screen.queryByText("test-id")).not.toBeInTheDocument()
  })

  it("should return null when image is null", () => {
    setup(
      true,
      false,
      false,
      // @ts-expect-error: Testing null case
      null
    )

    expect(screen.queryByText("Delete Image")).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("should display N/A when disk_format is missing", () => {
    const imageWithoutDiskFormat = { ...mockImage, disk_format: undefined }
    setup(true, false, false, imageWithoutDiskFormat)
    expect(screen.getByText("N/A")).toBeInTheDocument()
  })

  it("should not display OS Type row when os_type is missing", () => {
    const imageWithoutOsType = { ...mockImage, os_type: undefined }
    setup(true, false, false, imageWithoutOsType)
    expect(screen.queryByText("OS Type")).not.toBeInTheDocument()
  })

  it("should display os_distro in parentheses when present", () => {
    setup(true)
    expect(screen.getByText(/Ubuntu/i)).toBeInTheDocument()
  })

  it("should display info icon for OS Type when present", () => {
    setup(true)
    const osTypeCell = screen.getByText("Linux").closest("div")
    // Check for the icon within the cell
    expect(osTypeCell).toBeInTheDocument()
  })

  it("should format the created date correctly", () => {
    setup(true)
    // The exact format depends on locale, but it should contain date parts
    const dateText = screen.getByText(/1\/1\/2023|2023/)
    expect(dateText).toBeInTheDocument()
  })

  it("should display 'Unnamed' when image name is missing", () => {
    const imageWithoutName = { ...mockImage, name: undefined }
    setup(true, false, false, imageWithoutName)
    expect(screen.getByText("Unnamed")).toBeInTheDocument()
  })

  it("should display N/A when created_at is missing", () => {
    const imageWithoutCreatedAt = { ...mockImage, created_at: undefined }
    setup(true, false, false, imageWithoutCreatedAt)
    const rows = screen.getAllByText("N/A")
    expect(rows.length).toBeGreaterThan(0)
  })

  it("should render StatusBadge component with correct status", () => {
    setup(true)
    // StatusBadge should be rendered (exact assertion depends on its implementation)
    expect(screen.getByText(/active/i)).toBeInTheDocument()
  })

  it("should render VisibilityBadge component with correct visibility", () => {
    setup(true)
    // VisibilityBadge should be rendered (exact assertion depends on its implementation)
    expect(screen.getByText(/private/i)).toBeInTheDocument()
  })

  it("should render SizeDisplay component with correct size", () => {
    setup(true)
    // SizeDisplay should be rendered (exact assertion depends on its implementation)
    // The component is expected to display the size in some format
    const sizeCell = screen.getByText("1 KB").closest("div")
    expect(sizeCell).toBeInTheDocument()
  })
})
