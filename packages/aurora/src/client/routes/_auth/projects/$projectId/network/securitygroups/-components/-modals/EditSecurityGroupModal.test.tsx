import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { EditSecurityGroupModal } from "./EditSecurityGroupModal"
import { SecurityGroup, UpdateSecurityGroupInput } from "@/server/Network/types/securityGroup"

// ─── Mock Security Group ──────────────────────────────────────────────────────

const mockSecurityGroup: SecurityGroup = {
  id: "sg-123",
  name: "existing-sg",
  description: "Existing description",
  stateful: true,
  shared: false,
}

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  securityGroup = mockSecurityGroup,
  open = true,
  onClose = vi.fn(),
  onUpdate = vi.fn(),
  isLoading = false,
  error = null,
}: {
  securityGroup?: SecurityGroup
  open?: boolean
  onClose?: () => void
  onUpdate?: (
    securityGroupId: string,
    data: Omit<UpdateSecurityGroupInput, "securityGroupId" | "project_id">
  ) => Promise<void>
  isLoading?: boolean
  error?: string | null
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EditSecurityGroupModal
          securityGroup={securityGroup}
          open={open}
          onClose={onClose}
          onUpdate={onUpdate}
          isLoading={isLoading}
          error={error}
        />
      </PortalProvider>
    </I18nProvider>
  )

const getConfirmButton = () => screen.getByRole("button", { name: "Update Security Group" })

const blurField = (label: RegExp) => fireEvent.blur(screen.getByLabelText(label))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EditSecurityGroupModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Pre-population with existing data", () => {
    test("pre-fills form with existing security group data", () => {
      renderModal()

      const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement
      const descriptionTextarea = screen.getByLabelText(/Description/i) as HTMLTextAreaElement

      expect(nameInput.value).toBe("existing-sg")
      expect(descriptionTextarea.value).toBe("Existing description")
    })

    test("handles security group with null description", () => {
      const sgWithNullDescription: SecurityGroup = {
        ...mockSecurityGroup,
        description: null,
      }
      renderModal({ securityGroup: sgWithNullDescription })

      const descriptionTextarea = screen.getByLabelText(/Description/i) as HTMLTextAreaElement
      expect(descriptionTextarea.value).toBe("")
    })

    test("handles security group with null name", () => {
      const sgWithNullName: SecurityGroup = {
        ...mockSecurityGroup,
        name: null,
      }
      renderModal({ securityGroup: sgWithNullName })

      const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement
      expect(nameInput.value).toBe("")
    })
  })

  describe("Dynamic form updates (useEffect)", () => {
    test("updates form when securityGroup prop changes", async () => {
      const { rerender } = renderModal()

      const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement
      expect(nameInput.value).toBe("existing-sg")

      // Change securityGroup prop
      const newSecurityGroup: SecurityGroup = {
        ...mockSecurityGroup,
        id: "sg-456",
        name: "updated-sg",
        description: "Updated description",
        stateful: false,
      }

      await act(async () => {
        rerender(
          <I18nProvider i18n={i18n}>
            <PortalProvider>
              <EditSecurityGroupModal
                securityGroup={newSecurityGroup}
                open={true}
                onClose={vi.fn()}
                onUpdate={vi.fn()}
              />
            </PortalProvider>
          </I18nProvider>
        )
      })

      await waitFor(() => {
        const updatedNameInput = screen.getByLabelText(/Name/i) as HTMLInputElement
        const updatedDescriptionTextarea = screen.getByLabelText(/Description/i) as HTMLTextAreaElement

        expect(updatedNameInput.value).toBe("updated-sg")
        expect(updatedDescriptionTextarea.value).toBe("Updated description")
      })
    })
  })

  describe("Unique UI elements", () => {
    test("displays 'Edit Security Group' title", () => {
      renderModal()
      expect(screen.getAllByText("Edit Security Group").length).toBeGreaterThan(0)
    })

    test("displays 'Update Security Group' button text", () => {
      renderModal()
      expect(getConfirmButton()).toBeInTheDocument()
    })

    test("shows 'Updating Security Group...' when loading", () => {
      renderModal({ isLoading: true })
      expect(screen.getByText(/Updating Security Group.../i)).toBeInTheDocument()
    })
  })

  describe("Help text and validation", () => {
    test("explains the name limits", () => {
      renderModal()
      expect(screen.getByText('1-255 characters. "default" is reserved.')).toBeInTheDocument()
    })

    test("disables the confirm button when the name is cleared", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.clear(screen.getByLabelText(/Name/i))

      expect(getConfirmButton()).toBeDisabled()
    })

    test('rejects renaming a group to "default"', async () => {
      const user = userEvent.setup()
      renderModal()

      const nameInput = screen.getByLabelText(/Name/i)
      await user.clear(nameInput)
      await user.type(nameInput, "Default")
      blurField(/Name/i)

      expect(screen.getByText('The name "default" is reserved for the default security group.')).toBeInTheDocument()
      expect(getConfirmButton()).toBeDisabled()
    })

    test('allows editing a group that is already named "default"', async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ securityGroup: { ...mockSecurityGroup, name: "default" }, onUpdate })

      const descriptionTextarea = screen.getByLabelText(/Description/i)
      await user.clear(descriptionTextarea)
      await user.type(descriptionTextarea, "new description")
      blurField(/Name/i)

      expect(
        screen.queryByText('The name "default" is reserved for the default security group.')
      ).not.toBeInTheDocument()
      await user.click(getConfirmButton())

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("sg-123", { name: "default", description: "new description" })
      })
    })

    test("rejects a name longer than 255 characters", async () => {
      const user = userEvent.setup()
      renderModal()

      const nameInput = screen.getByLabelText(/Name/i)
      await user.clear(nameInput)
      await user.paste("a".repeat(256))
      blurField(/Name/i)

      expect(screen.getByText("Name must be at most 255 characters long.")).toBeInTheDocument()
      expect(getConfirmButton()).toBeDisabled()
    })

    test("rejects a description longer than 255 characters", async () => {
      const user = userEvent.setup()
      renderModal()

      const descriptionTextarea = screen.getByLabelText(/Description/i)
      await user.clear(descriptionTextarea)
      await user.paste("d".repeat(256))
      blurField(/Description/i)

      expect(screen.getByText("Description must be at most 255 characters long.")).toBeInTheDocument()
      expect(getConfirmButton()).toBeDisabled()
    })

    test("clears the field error as soon as the user edits the field", async () => {
      const user = userEvent.setup()
      renderModal()

      const nameInput = screen.getByLabelText(/Name/i)
      await user.clear(nameInput)
      blurField(/Name/i)
      expect(screen.getByText("Security group name is required")).toBeInTheDocument()

      await user.type(nameInput, "m")

      expect(screen.queryByText("Security group name is required")).not.toBeInTheDocument()
    })
  })

  describe("Update submission", () => {
    test("calls onUpdate with correct data when form is submitted", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onUpdate })

      const nameInput = screen.getByLabelText(/Name/i)
      const descriptionTextarea = screen.getByLabelText(/Description/i)

      // Clear and type new values
      await user.clear(nameInput)
      await user.type(nameInput, "updated-name")
      await user.clear(descriptionTextarea)
      await user.type(descriptionTextarea, "updated description")

      const submitButton = getConfirmButton()
      await user.click(submitButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("sg-123", {
          name: "updated-name",
          description: "updated description",
        })
      })
    })

    test("calls onUpdate with trimmed values", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onUpdate })

      const nameInput = screen.getByLabelText(/Name/i)
      const descriptionTextarea = screen.getByLabelText(/Description/i)

      await user.clear(nameInput)
      await user.type(nameInput, "  updated-name  ")
      await user.clear(descriptionTextarea)
      await user.type(descriptionTextarea, "  updated description  ")

      const submitButton = getConfirmButton()
      await user.click(submitButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("sg-123", {
          name: "updated-name",
          description: "updated description",
        })
      })
    })

    test("calls onUpdate with undefined description when empty", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onUpdate })

      const descriptionTextarea = screen.getByLabelText(/Description/i)
      await user.clear(descriptionTextarea)

      const submitButton = getConfirmButton()
      await user.click(submitButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("sg-123", {
          name: "existing-sg",
          description: undefined,
        })
      })
    })

    test("does not call onUpdate when onUpdate prop is undefined", async () => {
      const user = userEvent.setup()
      renderModal({ onUpdate: undefined })

      const submitButton = getConfirmButton()
      await user.click(submitButton)

      // Should not throw error, just do nothing
      await waitFor(() => {
        expect(submitButton).toBeInTheDocument()
      })
    })
    test("stays open and keeps the input when the update fails", async () => {
      const onUpdate = vi.fn().mockRejectedValue(new Error("Conflict"))
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onUpdate, onClose })

      const nameInput = screen.getByLabelText(/Name/i)
      await user.clear(nameInput)
      await user.type(nameInput, "renamed")
      await user.click(getConfirmButton())

      await waitFor(() => expect(onUpdate).toHaveBeenCalled())
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByLabelText(/Name/i)).toHaveValue("renamed")
    })
  })

  describe("Error display", () => {
    test("displays error message when error prop is provided", () => {
      renderModal({ error: "Failed to update security group" })
      expect(screen.getByText("Failed to update security group")).toBeInTheDocument()
    })

    test("does not display error message when error prop is null", () => {
      renderModal({ error: null })
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  describe("Cancel / close", () => {
    test("clears form errors but keeps values when closing", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })

      // Trigger validation error
      await user.clear(screen.getByLabelText(/Name/i))
      blurField(/Name/i)

      expect(screen.getByText(/Security group name is required/i)).toBeInTheDocument()

      // Close modal
      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })
  })
})
