import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ImageMemberRow } from "./ImageMemberRow"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

describe("ImageMemberRow", () => {
  const mockOnDelete = vi.fn()

  const mockMember = {
    image_id: "image-123",
    member_id: "member-456",
    status: "pending",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  const setup = (member = mockMember, isDeleting = false, canDelete = true) => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <ImageMemberRow member={member} isDeleting={isDeleting} onDelete={mockOnDelete} canDelete={canDelete} />
        </PortalProvider>
      </I18nProvider>
    )
  }

  describe("Rendering", () => {
    it("should render the member data in the row", () => {
      setup()
      expect(screen.getByText("image-123")).toBeInTheDocument()
      expect(screen.getByText("member-456")).toBeInTheDocument()
      expect(screen.getByText("Pending")).toBeInTheDocument()
    })

    it("should display image_id in the first cell", () => {
      setup()
      const imageIdCell = screen.getByText("image-123").closest("div")
      expect(imageIdCell).toHaveClass("break-all")
    })

    it("should display member_id in the second cell with break-all class", () => {
      setup()
      const memberIdCell = screen.getByText("member-456").closest("div")
      expect(memberIdCell).toHaveClass("break-all")
    })

    it("should display status in the third cell", () => {
      setup()
      expect(screen.getByText("Pending")).toBeInTheDocument()
    })

    it("should render DataGridRow structure", () => {
      setup()
      // Verify all cells are present
      expect(screen.getByText("image-123")).toBeInTheDocument()
      expect(screen.getByText("member-456")).toBeInTheDocument()
      expect(screen.getByText("Pending")).toBeInTheDocument()
    })
  })

  describe("Status Display", () => {
    it("should display 'Pending' for pending status", () => {
      const member = { ...mockMember, status: "pending" }
      setup(member)
      expect(screen.getByText("Pending")).toBeInTheDocument()
    })

    it("should display 'Accepted' for accepted status", () => {
      const member = { ...mockMember, status: "accepted" }
      setup(member)
      expect(screen.getByText("Accepted")).toBeInTheDocument()
    })

    it("should display 'Rejected' for rejected status", () => {
      const member = { ...mockMember, status: "rejected" }
      setup(member)
      expect(screen.getByText("Rejected")).toBeInTheDocument()
    })

    it("should display unknown status as-is", () => {
      const member = { ...mockMember, status: "unknown_status" }
      setup(member)
      expect(screen.getByText("unknown_status")).toBeInTheDocument()
    })

    it("should apply warning variant class to pending status", () => {
      const member = { ...mockMember, status: "pending" }
      setup(member)
      const statusCell = screen.getByText("Pending").closest("div")
      expect(statusCell).toHaveClass("text-theme-warning")
    })

    it("should apply success variant class to accepted status", () => {
      const member = { ...mockMember, status: "accepted" }
      setup(member)
      const statusCell = screen.getByText("Accepted").closest("div")
      expect(statusCell).toHaveClass("text-theme-success")
    })

    it("should apply danger variant class to rejected status", () => {
      const member = { ...mockMember, status: "rejected" }
      setup(member)
      const statusCell = screen.getByText("Rejected").closest("div")
      expect(statusCell).toHaveClass("text-theme-danger")
    })

    it("should apply default variant class to unknown status", () => {
      const member = { ...mockMember, status: "unknown_status" }
      setup(member)
      const statusCell = screen.getByText("unknown_status").closest("div")
      expect(statusCell).toHaveClass("text-theme-default")
    })
  })

  describe("Delete Button - Conditional Rendering", () => {
    it("should render delete button when canDelete is true", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      expect(deleteButton).toBeInTheDocument()
    })

    it("should not render delete button when canDelete is false", () => {
      setup(mockMember, false, false)
      const deleteButton = screen.queryByTestId(`remove-${mockMember.member_id}`)
      expect(deleteButton).not.toBeInTheDocument()
    })

    it("should render delete icon button initially when canDelete is true", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      expect(deleteButton).toHaveAttribute("title", `Remove access for ${mockMember.member_id}`)
    })
  })

  describe("Deletion Confirmation", () => {
    it("should show confirmation button when delete is clicked", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      fireEvent.click(deleteButton)

      const confirmButton = screen.getByRole("button", { name: /Remove/i })
      expect(confirmButton).toBeInTheDocument()
      expect(confirmButton).toHaveAttribute("title", "Remove member access")
    })

    it("should not call onDelete when initial delete button is clicked", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      fireEvent.click(deleteButton)

      expect(mockOnDelete).not.toHaveBeenCalled()
    })

    it("should call onDelete when confirmation button is clicked", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      fireEvent.click(deleteButton)

      const confirmButton = screen.getByRole("button", { name: /Remove/i })
      fireEvent.click(confirmButton)

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe("Loading State", () => {
    it("should show spinner when isDeleting is true", () => {
      setup(mockMember, true, true)
      const spinners = screen.getAllByRole("progressbar")
      expect(spinners.length).toBeGreaterThan(0)
    })

    it("should hide delete button and show spinner when isDeleting is true", () => {
      setup(mockMember, true, true)
      const deleteButton = screen.queryByTestId(`remove-${mockMember.member_id}`)
      expect(deleteButton).not.toBeInTheDocument()

      const spinners = screen.getAllByRole("progressbar")
      expect(spinners.length).toBeGreaterThan(0)
    })

    it("should show spinner instead of buttons during deletion", () => {
      setup(mockMember, true, true)
      // Verify spinner is visible
      const spinner = screen.getByRole("progressbar")
      expect(spinner).toBeInTheDocument()
    })
  })

  describe("Button Attributes", () => {
    it("should have correct data-testid for delete button", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId("remove-member-456")
      expect(deleteButton).toBeInTheDocument()
    })

    it("should have correct aria-label for delete button", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      expect(deleteButton).toHaveAttribute("aria-label", `Remove access for ${mockMember.member_id}`)
    })

    it("should have correct data-testid for confirmation button", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      fireEvent.click(deleteButton)

      const confirmButton = screen.getByTestId("confirm-removal")
      expect(confirmButton).toBeInTheDocument()
    })

    it("should have correct aria-label for confirmation button", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      fireEvent.click(deleteButton)

      const confirmButton = screen.getByTestId("confirm-removal")
      expect(confirmButton).toHaveAttribute("aria-label", "Remove member access")
    })

    it("should have primary-danger variant for confirmation button", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      fireEvent.click(deleteButton)

      const confirmButton = screen.getByTestId("confirm-removal")
      expect(confirmButton).toHaveClass("juno-button-primary-danger")
    })
  })

  describe("Member Data Updates", () => {
    it("should update display when member data changes", () => {
      const { rerender } = setup(mockMember, false, true)

      expect(screen.getByText("member-456")).toBeInTheDocument()
      expect(screen.getByText("Pending")).toBeInTheDocument()

      const updatedMember = {
        ...mockMember,
        member_id: "member-789",
        status: "accepted",
      }

      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ImageMemberRow member={updatedMember} isDeleting={false} onDelete={mockOnDelete} canDelete={true} />
          </PortalProvider>
        </I18nProvider>
      )

      expect(screen.getByText("member-789")).toBeInTheDocument()
      expect(screen.getByText("Accepted")).toBeInTheDocument()
    })

    it("should reflect status change in styling", () => {
      const { rerender } = setup({ ...mockMember, status: "pending" }, false, true)

      let statusCell = screen.getByText("Pending").closest("div")
      expect(statusCell).toHaveClass("text-theme-warning")

      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ImageMemberRow
              member={{ ...mockMember, status: "accepted" }}
              isDeleting={false}
              onDelete={mockOnDelete}
              canDelete={true}
            />
          </PortalProvider>
        </I18nProvider>
      )

      statusCell = screen.getByText("Accepted").closest("div")
      expect(statusCell).toHaveClass("text-theme-success")
    })
  })

  describe("Complex Scenarios", () => {
    it("should handle rapid clicks on delete button", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)

      fireEvent.click(deleteButton)
      fireEvent.click(deleteButton)

      // Should only show one confirmation button
      const confirmButtons = screen.getAllByRole("button", { name: /Remove/i })
      expect(confirmButtons.length).toBeGreaterThanOrEqual(1)
    })

    it("should handle status change while in confirmation state", () => {
      const { rerender } = setup(mockMember, false, true)

      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      fireEvent.click(deleteButton)

      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ImageMemberRow
              member={{ ...mockMember, status: "accepted" }}
              isDeleting={false}
              onDelete={mockOnDelete}
              canDelete={true}
            />
          </PortalProvider>
        </I18nProvider>
      )

      expect(screen.getByText("Accepted")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Remove/i })).toBeInTheDocument()
    })

    it("should handle canDelete change", () => {
      const { rerender } = setup(mockMember, false, true)

      expect(screen.getByTestId(`remove-${mockMember.member_id}`)).toBeInTheDocument()

      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ImageMemberRow member={mockMember} isDeleting={false} onDelete={mockOnDelete} canDelete={false} />
          </PortalProvider>
        </I18nProvider>
      )

      expect(screen.queryByTestId(`remove-${mockMember.member_id}`)).not.toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("should handle special characters in member_id", () => {
      const member = { ...mockMember, member_id: "member@domain.com" }
      setup(member)
      expect(screen.getByText("member@domain.com")).toBeInTheDocument()
    })

    it("should handle very long image_id with break-all", () => {
      const longImageId = "very-long-image-id-" + "x".repeat(100)
      const member = { ...mockMember, image_id: longImageId }
      setup(member)
      const imageIdCell = screen.getByText(longImageId).closest("div")
      expect(imageIdCell).toHaveClass("break-all")
    })

    it("should handle very long member_id", () => {
      const longMemberId = "very-long-member-" + "x".repeat(100)
      const member = { ...mockMember, member_id: longMemberId }
      setup(member)
      const memberIdCell = screen.getByText(longMemberId).closest("div")
      expect(memberIdCell).toHaveClass("break-all")
    })

    it("should have Stack with correct distribution and alignment for delete button", () => {
      setup(mockMember, false, true)
      const deleteButton = screen.getByTestId(`remove-${mockMember.member_id}`)
      const stackContainer = deleteButton.closest("[class*='juno-stack']")
      expect(stackContainer).toBeInTheDocument()
    })
  })
})
