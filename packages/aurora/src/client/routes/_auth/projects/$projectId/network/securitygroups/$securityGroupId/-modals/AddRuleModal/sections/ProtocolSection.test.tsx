import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
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
      ruleType: "other-protocol",
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

    test("explains which values are accepted", () => {
      render(<TestWrapper />)
      expect(
        screen.getByText("Protocol name (e.g. tcp, udp, icmp, gre) or IP protocol number 0-255.")
      ).toBeInTheDocument()
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

  describe("Validation", () => {
    test("shows the required error when the field is left empty", async () => {
      render(<TestWrapper />)

      fireEvent.blur(screen.getByLabelText(/Protocol/i))

      expect(await screen.findByText("Protocol is required")).toBeInTheDocument()
    })

    test.each(["256", "tc p", "tcp!"])('rejects the malformed protocol "%s"', async (protocol) => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const input = screen.getByLabelText(/Protocol/i)
      await user.type(input, protocol)
      fireEvent.blur(input)

      expect(
        await screen.findByText("Enter a protocol name (e.g. gre) or a protocol number from 0 to 255")
      ).toBeInTheDocument()
    })

    test.each(["gre", "GRE", " 47 ", "255"])('accepts the protocol "%s"', async (protocol) => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const input = screen.getByLabelText(/Protocol/i)
      await user.type(input, protocol)
      fireEvent.blur(input)

      expect(screen.queryByText(/Enter a protocol name/)).not.toBeInTheDocument()
      expect(screen.queryByText("Protocol is required")).not.toBeInTheDocument()
    })

    test("shows the required error when the field holds only spaces", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const input = screen.getByLabelText(/Protocol/i)
      await user.type(input, "   ")
      fireEvent.blur(input)

      expect(await screen.findByText("Protocol is required")).toBeInTheDocument()
    })

    test("hides the required error as soon as the user types", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const input = screen.getByLabelText(/Protocol/i)
      fireEvent.blur(input)
      expect(await screen.findByText("Protocol is required")).toBeInTheDocument()

      await user.type(input, "g")
      expect(screen.queryByText("Protocol is required")).not.toBeInTheDocument()
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
