import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ImageMemberFormRow } from "./ImageMemberFormRow"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

describe("ImageMemberFormRow", () => {
  const mockOnMemberIdChange = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  const setup = (memberId = "member-123", imageId = "image-456", errors = {}, isLoading = false) => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <ImageMemberFormRow
            memberId={memberId}
            imageId={imageId}
            errors={errors}
            isLoading={isLoading}
            onMemberIdChange={mockOnMemberIdChange}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </PortalProvider>
      </I18nProvider>
    )
  }

  it("should render the form row with all cells", () => {
    setup()
    expect(screen.getByDisplayValue("member-123")).toBeInTheDocument()
    expect(screen.getByText("image-456")).toBeInTheDocument()
    expect(screen.getByText("pending")).toBeInTheDocument()
  })

  it("should display the image ID in the first cell", () => {
    setup("test-member", "test-image-id")
    expect(screen.getByText("test-image-id")).toBeInTheDocument()
  })

  it("should display the member ID value in the input field", () => {
    const memberId = "member-xyz-789"
    setup(memberId)
    const input = screen.getByDisplayValue(memberId) as HTMLInputElement
    expect(input.value).toBe(memberId)
  })

  it("should display pending status badge", () => {
    setup()
    expect(screen.getByText("pending")).toBeInTheDocument()
  })

  it("should call onMemberIdChange when input value changes", () => {
    setup()
    const input = screen.getByPlaceholderText("Enter member ID") as HTMLInputElement
    fireEvent.change(input, { target: { value: "new-member-id" } })
    expect(mockOnMemberIdChange).toHaveBeenCalledWith("new-member-id")
  })

  it("should handle multiple input changes", () => {
    setup()
    const input = screen.getByPlaceholderText("Enter member ID") as HTMLInputElement

    fireEvent.change(input, { target: { value: "first-change" } })
    expect(mockOnMemberIdChange).toHaveBeenCalledWith("first-change")

    fireEvent.change(input, { target: { value: "second-change" } })
    expect(mockOnMemberIdChange).toHaveBeenCalledWith("second-change")

    expect(mockOnMemberIdChange).toHaveBeenCalledTimes(2)
  })

  it("should call onSave when the check button is clicked", () => {
    setup()
    const saveButton = screen.getByRole("button", { name: /Add Member/i })
    fireEvent.click(saveButton)
    expect(mockOnSave).toHaveBeenCalledTimes(1)
  })

  it("should call onCancel when the cancel button is clicked", () => {
    setup()
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it("should disable both buttons when isLoading is true", () => {
    setup("member-123", "image-456", {}, true)
    const saveButton = screen.getByRole("button", { name: /Add Member/i })
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })

    expect(saveButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
  })

  it("should enable both buttons when isLoading is false", () => {
    setup("member-123", "image-456", {}, false)
    const saveButton = screen.getByRole("button", { name: /Add Member/i })
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })

    expect(saveButton).not.toBeDisabled()
    expect(cancelButton).not.toBeDisabled()
  })

  it("should display error message when errors.memberId is provided", () => {
    setup("member-123", "image-456", { memberId: "Member ID is required" })
    expect(screen.getByText("Member ID is required")).toBeInTheDocument()
  })

  it("should display different error message", () => {
    setup("member-123", "image-456", { memberId: "Invalid member ID format" })
    expect(screen.getByText("Invalid member ID format")).toBeInTheDocument()
  })

  it("should not display error message when errors object is empty", () => {
    setup("member-123", "image-456", {})
    expect(screen.queryByText("Member ID is required")).not.toBeInTheDocument()
  })

  it("should update input value when memberId prop changes", () => {
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <ImageMemberFormRow
            memberId="initial-member"
            imageId="image-456"
            errors={{}}
            isLoading={false}
            onMemberIdChange={mockOnMemberIdChange}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </PortalProvider>
      </I18nProvider>
    )

    expect(screen.getByDisplayValue("initial-member")).toBeInTheDocument()

    rerender(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <ImageMemberFormRow
            memberId="updated-member"
            imageId="image-456"
            errors={{}}
            isLoading={false}
            onMemberIdChange={mockOnMemberIdChange}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </PortalProvider>
      </I18nProvider>
    )

    expect(screen.getByDisplayValue("updated-member")).toBeInTheDocument()
  })

  it("should have placeholder text on input", () => {
    setup()
    const input = screen.getByPlaceholderText("Enter member ID")
    expect(input).toBeInTheDocument()
  })

  it("should render save button with check icon", () => {
    setup()
    const saveButton = screen.getByRole("button", { name: /Add Member/i })
    expect(saveButton).toHaveAttribute("title", "Add Member")
  })

  it("should render cancel button with cancel icon", () => {
    setup()
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    expect(cancelButton).toHaveAttribute("title", "Cancel")
  })

  it("should handle empty memberId", () => {
    setup("")
    const input = screen.getByPlaceholderText("Enter member ID") as HTMLInputElement
    expect(input.value).toBe("")
  })

  it("should preserve button functionality after error clear", () => {
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <ImageMemberFormRow
            memberId="member-123"
            imageId="image-456"
            errors={{ memberId: "Error message" }}
            isLoading={false}
            onMemberIdChange={mockOnMemberIdChange}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </PortalProvider>
      </I18nProvider>
    )

    expect(screen.getByText("Error message")).toBeInTheDocument()

    rerender(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <ImageMemberFormRow
            memberId="member-123"
            imageId="image-456"
            errors={{}}
            isLoading={false}
            onMemberIdChange={mockOnMemberIdChange}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </PortalProvider>
      </I18nProvider>
    )

    expect(screen.queryByText("Error message")).not.toBeInTheDocument()
    const saveButton = screen.getByRole("button", { name: /Add Member/i })
    fireEvent.click(saveButton)
    expect(mockOnSave).toHaveBeenCalled()
  })

  it("should handle rapid save and cancel clicks", () => {
    setup()
    const saveButton = screen.getByRole("button", { name: /Add Member/i })
    const cancelButton = screen.getByRole("button", { name: /Cancel/i })

    fireEvent.click(saveButton)
    fireEvent.click(cancelButton)
    fireEvent.click(saveButton)

    expect(mockOnSave).toHaveBeenCalledTimes(2)
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it("should use correct DataGridRow and DataGridCell components", () => {
    setup()
    // Verify the structure by checking all expected cells are rendered
    expect(screen.getByText("image-456")).toBeInTheDocument()
    expect(screen.getByDisplayValue("member-123")).toBeInTheDocument()
    expect(screen.getByText("pending")).toBeInTheDocument()
  })

  it("should handle special characters in imageId", () => {
    setup("member-123", "image-with-special-chars_123-456")
    expect(screen.getByText("image-with-special-chars_123-456")).toBeInTheDocument()
  })

  it("should handle special characters in memberId input", () => {
    setup("member@example.com")
    const input = screen.getByDisplayValue("member@example.com") as HTMLInputElement
    expect(input.value).toBe("member@example.com")
  })

  it("should handle very long imageId with break-all class", () => {
    const longImageId = "very-long-image-id-" + "x".repeat(100)
    setup("member-123", longImageId)
    const imageIdCell = screen.getByText(longImageId).closest("div")
    expect(imageIdCell).toHaveClass("break-all")
  })

  it("should apply correct className to imageId cell", () => {
    setup()
    const imageIdCell = screen.getByText("image-456").closest("div")
    expect(imageIdCell).toHaveClass("break-all")
  })
})
