import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CreateSecurityGroupModal } from "./CreateSecurityGroupModal"
import { CreateSecurityGroupInput } from "@/server/Network/types/securityGroup"

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  onClose = vi.fn(),
  onCreate = vi.fn(),
  isLoading = false,
}: {
  isOpen?: boolean
  onClose?: () => void
  onCreate?: (securityGroupData: Omit<CreateSecurityGroupInput, "project_id">) => Promise<void>
  isLoading?: boolean
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CreateSecurityGroupModal isOpen={isOpen} onClose={onClose} onCreate={onCreate} isLoading={isLoading} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CreateSecurityGroupModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText("Create Security Group")).not.toBeInTheDocument()
    })

    test("renders when isOpen is true", () => {
      renderModal()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getAllByText("Create Security Group").length).toBeGreaterThan(0)
    })
  })

  describe("Form rendering", () => {
    test("renders all form fields", () => {
      renderModal()
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Stateful/i)).toBeInTheDocument()
    })

    test("renders Create Security Group and Cancel buttons", () => {
      renderModal()
      expect(screen.getByTestId("create-security-group-button")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("stateful checkbox is checked by default", () => {
      renderModal()
      const statefulCheckbox = screen.getByLabelText(/Stateful/i) as HTMLInputElement
      expect(statefulCheckbox.checked).toBe(true)
    })
  })

  describe("Loading state", () => {
    test("shows loading spinner when isLoading is true", () => {
      renderModal({ isLoading: true })
      expect(screen.getByText(/Creating security group.../i)).toBeInTheDocument()
    })

    test("disables buttons when isLoading is true", () => {
      renderModal({ isLoading: true })
      expect(screen.getByTestId("create-security-group-button")).toBeDisabled()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled()
    })

    test("hides form when loading", () => {
      renderModal({ isLoading: true })
      expect(screen.queryByLabelText(/Name/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Description/i)).not.toBeInTheDocument()
    })
  })

  describe("Validation", () => {
    test("shows error when submitting with empty name", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      const submitButton = screen.getByTestId("create-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Security group name is required/i)).toBeInTheDocument()
      })
      expect(onCreate).not.toHaveBeenCalled()
    })

    test("shows error when name is only whitespace", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      const nameInput = screen.getByLabelText(/Name/i)
      await user.type(nameInput, "   ")

      const submitButton = screen.getByTestId("create-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Security group name is required/i)).toBeInTheDocument()
      })
      expect(onCreate).not.toHaveBeenCalled()
    })

    test("clears error when valid name is entered", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      // Trigger error first
      const submitButton = screen.getByTestId("create-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Security group name is required/i)).toBeInTheDocument()
      })

      // Enter valid name
      const nameInput = screen.getByLabelText(/Name/i)
      await user.type(nameInput, "my-security-group")

      await waitFor(() => {
        expect(screen.queryByText(/Security group name is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe("Submission", () => {
    test("calls onCreate with correct data when form is valid", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      const nameInput = screen.getByLabelText(/Name/i)
      const descriptionTextarea = screen.getByLabelText(/Description/i)

      await user.type(nameInput, "test-security-group")
      await user.type(descriptionTextarea, "Test description")

      const submitButton = screen.getByTestId("create-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith({
          name: "test-security-group",
          description: "Test description",
          stateful: true,
        })
      })
    })

    test("calls onCreate with trimmed name and description", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      const nameInput = screen.getByLabelText(/Name/i)
      const descriptionTextarea = screen.getByLabelText(/Description/i)

      await user.type(nameInput, "  test-security-group  ")
      await user.type(descriptionTextarea, "  Test description  ")

      const submitButton = screen.getByTestId("create-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith({
          name: "test-security-group",
          description: "Test description",
          stateful: true,
        })
      })
    })

    test("calls onCreate with undefined description when empty", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      const nameInput = screen.getByLabelText(/Name/i)
      await user.type(nameInput, "test-security-group")

      const submitButton = screen.getByTestId("create-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith({
          name: "test-security-group",
          description: undefined,
          stateful: true,
        })
      })
    })

    test("calls onCreate with stateful set to false when unchecked", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      const nameInput = screen.getByLabelText(/Name/i)
      const statefulCheckbox = screen.getByLabelText(/Stateful/i)

      await user.type(nameInput, "test-security-group")
      await user.click(statefulCheckbox) // Uncheck

      const submitButton = screen.getByTestId("create-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith({
          name: "test-security-group",
          description: undefined,
          stateful: false,
        })
      })
    })

    test("calls onClose after successful submission", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onCreate, onClose })

      const nameInput = screen.getByLabelText(/Name/i)
      await user.type(nameInput, "test-security-group")

      const submitButton = screen.getByTestId("create-security-group-button")
      await user.click(submitButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  describe("Cancel / close", () => {
    test("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })
  })
})
