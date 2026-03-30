import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { useForm } from "@tanstack/react-form"
import { ProtocolSection } from "./ProtocolSection"
import { DEFAULT_VALUES } from "../types"
import { createRuleFormSchema } from "../validation/formSchema"

// ─── Test wrapper component ───────────────────────────────────────────────────

function TestWrapper({
  disabled = false,
  defaultProtocol = null,
}: {
  disabled?: boolean
  defaultProtocol?: string | null
}) {
  const form = useForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      protocol: defaultProtocol,
    },
    validators: {
      onSubmit: createRuleFormSchema,
    },
    onSubmit: async () => {},
  })

  return (
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ProtocolSection form={form} disabled={disabled} />
      </PortalProvider>
    </I18nProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProtocolSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    test("renders Protocol input field", () => {
      render(<TestWrapper />)
      expect(screen.getByLabelText(/Protocol/i)).toBeInTheDocument()
    })

    test("renders with placeholder text", () => {
      render(<TestWrapper />)
      const input = screen.getByLabelText(/Protocol/i)
      expect(input).toHaveAttribute("placeholder", "tcp, udp, icmp, or protocol number")
    })

    test("renders empty when protocol is null", () => {
      render(<TestWrapper defaultProtocol={null} />)
      const input = screen.getByLabelText(/Protocol/i) as HTMLInputElement
      expect(input.value).toBe("")
    })
  })

  describe("User interactions", () => {
    test("accepts text input", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const input = screen.getByLabelText(/Protocol/i)
      await user.type(input, "tcp")

      expect(input).toHaveValue("tcp")
    })

    test("accepts protocol number input", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const input = screen.getByLabelText(/Protocol/i)
      await user.type(input, "47")

      expect(input).toHaveValue("47")
    })

    test("can be cleared after entering value", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultProtocol="tcp" />)

      const input = screen.getByLabelText(/Protocol/i)
      await user.clear(input)

      expect(input).toHaveValue("")
    })
  })

  describe("Disabled state", () => {
    test("disables input when disabled prop is true", () => {
      render(<TestWrapper disabled={true} />)
      const input = screen.getByLabelText(/Protocol/i)
      expect(input).toBeDisabled()
    })
  })

  describe("Initial values", () => {
    test("displays initial protocol value", () => {
      render(<TestWrapper defaultProtocol="udp" />)
      const input = screen.getByLabelText(/Protocol/i)
      expect(input).toHaveValue("udp")
    })
  })
})
