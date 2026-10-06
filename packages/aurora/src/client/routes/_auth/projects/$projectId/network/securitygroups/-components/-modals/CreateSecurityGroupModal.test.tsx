import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
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
  error = null,
}: {
  isOpen?: boolean
  onClose?: () => void
  onCreate?: (securityGroupData: Omit<CreateSecurityGroupInput, "project_id">) => Promise<void>
  isLoading?: boolean
  error?: string | null
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CreateSecurityGroupModal
          isOpen={isOpen}
          onClose={onClose}
          onCreate={onCreate}
          isLoading={isLoading}
          error={error}
        />
      </PortalProvider>
    </I18nProvider>
  )

const blurField = (label: RegExp) => fireEvent.blur(screen.getByLabelText(label))

const getConfirmButton = () => screen.getByRole("button", { name: "Create Security Group" })

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
      expect(getConfirmButton()).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("stateful checkbox is checked by default", () => {
      renderModal()
      const statefulCheckbox = screen.getByLabelText(/Stateful/i) as HTMLInputElement
      expect(statefulCheckbox.checked).toBe(true)
    })
  })

  describe("Loading state", () => {
    test("shows loading state when isLoading is true", () => {
      renderModal({ isLoading: true })
      expect(screen.getByText(/Creating Security Group.../i)).toBeInTheDocument()
    })

    test("disables buttons when isLoading is true", () => {
      renderModal({ isLoading: true })
      expect(getConfirmButton()).toBeDisabled()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled()
    })

    test("hides form when loading", () => {
      renderModal({ isLoading: true })
      expect(screen.queryByLabelText(/Name/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Description/i)).not.toBeInTheDocument()
    })
  })

  describe("Help text", () => {
    test("explains the limits of every field", () => {
      renderModal()
      expect(screen.getByText('1-255 characters. "default" is reserved.')).toBeInTheDocument()
      expect(screen.getByText(/In a stateless group, return traffic needs its own rules/)).toBeInTheDocument()
    })
  })

  describe("Validation", () => {
    test("disables the confirm button while the name is empty", () => {
      renderModal()
      expect(getConfirmButton()).toBeDisabled()
    })

    test("disables the confirm button when the name is only whitespace", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.type(screen.getByLabelText(/Name/i), "   ")

      expect(getConfirmButton()).toBeDisabled()
    })

    test("enables the confirm button once a valid name is entered", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.type(screen.getByLabelText(/Name/i), "my-security-group")

      expect(getConfirmButton()).toBeEnabled()
    })

    test("shows the required error when the name field is left empty", () => {
      renderModal()

      blurField(/Name/i)

      expect(screen.getByText("Security group name is required")).toBeInTheDocument()
    })

    test("shows the required error when the form is submitted with Enter and an empty name", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      const nameInput = screen.getByLabelText(/Name/i)
      await user.type(nameInput, "   ")
      fireEvent.submit(nameInput.closest("form")!)

      expect(await screen.findByText("Security group name is required")).toBeInTheDocument()
      expect(onCreate).not.toHaveBeenCalled()
    })

    test.each(["default", "Default", " DEFAULT "])('rejects the reserved name "%s"', async (name) => {
      const user = userEvent.setup()
      renderModal()

      await user.type(screen.getByLabelText(/Name/i), name)
      blurField(/Name/i)

      expect(
        await screen.findByText('The name "default" is reserved for the default security group.')
      ).toBeInTheDocument()
      expect(getConfirmButton()).toBeDisabled()
    })

    test("rejects a name longer than 255 characters", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByLabelText(/Name/i))
      await user.paste("a".repeat(256))
      blurField(/Name/i)

      expect(await screen.findByText("Name must be at most 255 characters long.")).toBeInTheDocument()
      expect(getConfirmButton()).toBeDisabled()
    })

    test("accepts a name of exactly 255 characters", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByLabelText(/Name/i))
      await user.paste("a".repeat(255))
      blurField(/Name/i)

      expect(screen.queryByText("Name must be at most 255 characters long.")).not.toBeInTheDocument()
      expect(getConfirmButton()).toBeEnabled()
    })

    test("rejects a description longer than 255 characters", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.type(screen.getByLabelText(/Name/i), "my-security-group")
      await user.click(screen.getByLabelText(/Description/i))
      await user.paste("d".repeat(256))
      blurField(/Description/i)

      expect(await screen.findByText("Description must be at most 255 characters long.")).toBeInTheDocument()
      expect(getConfirmButton()).toBeDisabled()
    })

    test("clears the field error as soon as the user edits the field", async () => {
      const user = userEvent.setup()
      renderModal()

      const nameInput = screen.getByLabelText(/Name/i)
      blurField(/Name/i)
      expect(await screen.findByText("Security group name is required")).toBeInTheDocument()

      await user.type(nameInput, "m")

      expect(screen.queryByText("Security group name is required")).not.toBeInTheDocument()
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

      const submitButton = getConfirmButton()
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

      const submitButton = getConfirmButton()
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

      const submitButton = getConfirmButton()
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

      const submitButton = getConfirmButton()
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

      const submitButton = getConfirmButton()
      await user.click(submitButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
    test("stays open and keeps the input when creation fails", async () => {
      const onCreate = vi.fn().mockRejectedValue(new Error("Quota exceeded"))
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onCreate, onClose })

      await user.type(screen.getByLabelText(/Name/i), "test-security-group")
      await user.click(getConfirmButton())

      await waitFor(() => expect(onCreate).toHaveBeenCalled())
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByLabelText(/Name/i)).toHaveValue("test-security-group")
    })

    test("shows the error passed by the parent", () => {
      renderModal({ error: "Quota exceeded for resources: ['security_group']." })
      expect(screen.getByText("Quota exceeded for resources: ['security_group'].")).toBeInTheDocument()
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
