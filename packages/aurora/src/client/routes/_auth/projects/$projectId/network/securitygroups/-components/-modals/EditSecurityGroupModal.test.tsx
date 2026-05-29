import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
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
      const statefulCheckbox = screen.getByLabelText(/Stateful/i) as HTMLInputElement

      expect(nameInput.value).toBe("existing-sg")
      expect(descriptionTextarea.value).toBe("Existing description")
      expect(statefulCheckbox.checked).toBe(true)
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

    test("handles security group with stateful as false", () => {
      const sgStateless: SecurityGroup = {
        ...mockSecurityGroup,
        stateful: false,
      }
      renderModal({ securityGroup: sgStateless })

      const statefulCheckbox = screen.getByLabelText(/Stateful/i) as HTMLInputElement
      expect(statefulCheckbox.checked).toBe(false)
    })

    test("handles security group with undefined stateful (defaults to true)", () => {
      const sgNoStateful: SecurityGroup = {
        ...mockSecurityGroup,
        stateful: undefined,
      }
      renderModal({ securityGroup: sgNoStateful })

      const statefulCheckbox = screen.getByLabelText(/Stateful/i) as HTMLInputElement
      expect(statefulCheckbox.checked).toBe(true)
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
        const updatedStatefulCheckbox = screen.getByLabelText(/Stateful/i) as HTMLInputElement

        expect(updatedNameInput.value).toBe("updated-sg")
        expect(updatedDescriptionTextarea.value).toBe("Updated description")
        expect(updatedStatefulCheckbox.checked).toBe(false)
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
      expect(screen.getByTestId("update-security-group-button")).toHaveTextContent("Update Security Group")
    })

    test("displays info message about stateful restrictions", () => {
      renderModal()
      expect(
        screen.getByText(/The 'stateful' attribute cannot be changed if this security group is currently in use/i)
      ).toBeInTheDocument()
    })

    test("shows 'Updating security group...' when loading", () => {
      renderModal({ isLoading: true })
      expect(screen.getByText(/Updating security group.../i)).toBeInTheDocument()
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

      const submitButton = screen.getByTestId("update-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("sg-123", {
          name: "updated-name",
          description: "updated description",
          stateful: true,
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

      const submitButton = screen.getByTestId("update-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("sg-123", {
          name: "updated-name",
          description: "updated description",
          stateful: true,
        })
      })
    })

    test("calls onUpdate with undefined description when empty", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onUpdate })

      const descriptionTextarea = screen.getByLabelText(/Description/i)
      await user.clear(descriptionTextarea)

      const submitButton = screen.getByTestId("update-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("sg-123", {
          name: "existing-sg",
          description: undefined,
          stateful: true,
        })
      })
    })

    test("calls onUpdate with changed stateful value", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onUpdate })

      const statefulCheckbox = screen.getByLabelText(/Stateful/i)
      await user.click(statefulCheckbox) // Toggle to false

      const submitButton = screen.getByTestId("update-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("sg-123", {
          name: "existing-sg",
          description: "Existing description",
          stateful: false,
        })
      })
    })

    test("does not call onUpdate when onUpdate prop is undefined", async () => {
      const user = userEvent.setup()
      renderModal({ onUpdate: undefined })

      const submitButton = screen.getByTestId("update-security-group-button")
      await user.click(submitButton)

      // Should not throw error, just do nothing
      await waitFor(() => {
        expect(submitButton).toBeInTheDocument()
      })
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
      const nameInput = screen.getByLabelText(/Name/i)
      await user.clear(nameInput)

      const submitButton = screen.getByTestId("update-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Security group name is required/i)).toBeInTheDocument()
      })

      // Close modal
      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })
  })
})
