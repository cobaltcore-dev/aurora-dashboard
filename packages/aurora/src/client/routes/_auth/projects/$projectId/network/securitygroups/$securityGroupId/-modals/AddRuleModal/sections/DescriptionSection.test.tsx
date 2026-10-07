import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { useForm } from "@tanstack/react-form"
import { DescriptionSection } from "./DescriptionSection"
import { DEFAULT_VALUES } from "../types"
import { createRuleFormSchema } from "../validation/formSchema"

// ─── Test wrapper component ───────────────────────────────────────────────────

function TestWrapper({
  disabled = false,
  defaultDescription = "",
}: {
  disabled?: boolean
  defaultDescription?: string
}) {
  const form = useForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      description: defaultDescription,
    },
    validators: {
      onSubmit: createRuleFormSchema,
    },
    onSubmit: async () => {},
  })

  return (
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DescriptionSection form={form} disabled={disabled} />
      </PortalProvider>
    </I18nProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DescriptionSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    test("renders Description textarea", () => {
      render(<TestWrapper />)
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
    })

    test("explains that it is optional and its limit", () => {
      render(<TestWrapper />)
      expect(screen.getByText("Optional. Up to 255 characters.")).toBeInTheDocument()
    })

    test("renders without placeholder text", () => {
      render(<TestWrapper />)
      const textarea = screen.getByLabelText(/Description/i)
      expect(textarea.getAttribute("placeholder") ?? "").toBe("")
    })

    test("renders empty by default", () => {
      render(<TestWrapper />)
      const textarea = screen.getByLabelText(/Description/i) as HTMLTextAreaElement
      expect(textarea.value).toBe("")
    })
  })

  describe("User interactions", () => {
    test("accepts text input", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const textarea = screen.getByLabelText(/Description/i)
      await user.type(textarea, "Test description")

      expect(textarea).toHaveValue("Test description")
    })

    test("accepts multiline text", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const textarea = screen.getByLabelText(/Description/i)
      await user.type(textarea, "Line 1{Enter}Line 2")

      expect(textarea).toHaveValue("Line 1\nLine 2")
    })

    test("can be cleared after entering value", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultDescription="Initial description" />)

      const textarea = screen.getByLabelText(/Description/i)
      await user.clear(textarea)

      expect(textarea).toHaveValue("")
    })
  })

  describe("Validation", () => {
    test("rejects a description longer than 255 characters once the field is left", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const textarea = screen.getByLabelText(/Description/i)
      await user.click(textarea)
      await user.paste("d".repeat(256))
      expect(screen.queryByText("Description must be at most 255 characters long.")).not.toBeInTheDocument()

      fireEvent.blur(textarea)
      expect(await screen.findByText("Description must be at most 255 characters long.")).toBeInTheDocument()
    })

    test("accepts a description of exactly 255 characters", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const textarea = screen.getByLabelText(/Description/i)
      await user.click(textarea)
      await user.paste("d".repeat(255))
      fireEvent.blur(textarea)

      expect(screen.queryByText("Description must be at most 255 characters long.")).not.toBeInTheDocument()
    })
  })

  describe("Disabled state", () => {
    test("disables textarea when disabled prop is true", () => {
      render(<TestWrapper disabled={true} />)
      const textarea = screen.getByLabelText(/Description/i)
      expect(textarea).toBeDisabled()
    })
  })

  describe("Initial values", () => {
    test("displays initial description value", () => {
      render(<TestWrapper defaultDescription="Initial description" />)
      const textarea = screen.getByLabelText(/Description/i)
      expect(textarea).toHaveValue("Initial description")
    })
  })
})
