import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { useForm } from "@tanstack/react-form"
import { IcmpSection } from "./IcmpSection"
import { DEFAULT_VALUES } from "../types"
import { createRuleFormSchema } from "../validation/formSchema"

// ─── Test wrapper component ───────────────────────────────────────────────────

function TestWrapper({
  disabled = false,
  defaultIcmpType = "",
  defaultIcmpCode = "",
}: {
  disabled?: boolean
  defaultIcmpType?: string
  defaultIcmpCode?: string
}) {
  const form = useForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      ruleType: "custom-icmp",
      protocol: "icmp" as string | null,
      icmpType: defaultIcmpType,
      icmpCode: defaultIcmpCode,
    },
    validators: {
      onSubmit: createRuleFormSchema,
    },
    onSubmit: async () => {},
  })

  return (
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <IcmpSection form={form} disabled={disabled} />
      </PortalProvider>
    </I18nProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("IcmpSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    test("renders ICMP Type and ICMP Code inputs", () => {
      render(<TestWrapper />)
      expect(screen.getByLabelText(/ICMP Type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/ICMP Code/i)).toBeInTheDocument()
    })

    test("explains the range and what an empty field means", () => {
      render(<TestWrapper />)
      expect(screen.getByText("0-255. Leave empty to allow all types.")).toBeInTheDocument()
      expect(screen.getByText("0-255. Leave empty to allow all codes. Requires an ICMP type.")).toBeInTheDocument()
    })

    test("both inputs are empty by default", () => {
      render(<TestWrapper />)
      const typeInput = screen.getByLabelText(/ICMP Type/i) as HTMLInputElement
      const codeInput = screen.getByLabelText(/ICMP Code/i) as HTMLInputElement

      expect(typeInput.value).toBe("")
      expect(codeInput.value).toBe("")
    })
  })

  describe("ICMP Type input", () => {
    test("accepts numeric input", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const typeInput = screen.getByLabelText(/ICMP Type/i)
      await user.type(typeInput, "8")

      expect(typeInput).toHaveValue("8")
    })

    test("can be cleared", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultIcmpType="8" />)

      const typeInput = screen.getByLabelText(/ICMP Type/i)
      await user.clear(typeInput)

      expect(typeInput).toHaveValue("")
    })

    test("can be disabled", () => {
      render(<TestWrapper disabled={true} />)
      const typeInput = screen.getByLabelText(/ICMP Type/i)
      expect(typeInput).toBeDisabled()
    })
  })

  describe("ICMP Code input", () => {
    test("accepts numeric input", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const codeInput = screen.getByLabelText(/ICMP Code/i)
      await user.type(codeInput, "0")

      expect(codeInput).toHaveValue("0")
    })

    test("can be cleared", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultIcmpCode="0" />)

      const codeInput = screen.getByLabelText(/ICMP Code/i)
      await user.clear(codeInput)

      expect(codeInput).toHaveValue("")
    })

    test("can be disabled", () => {
      render(<TestWrapper disabled={true} />)
      const codeInput = screen.getByLabelText(/ICMP Code/i)
      expect(codeInput).toBeDisabled()
    })
  })

  describe("Validation", () => {
    test("shows the range error once the field is left", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultIcmpType="" />)

      const typeInput = screen.getByLabelText(/ICMP Type/i)
      await user.type(typeInput, "256")
      expect(screen.queryByText("ICMP type must be between 0 and 255")).not.toBeInTheDocument()

      fireEvent.blur(typeInput)
      expect(await screen.findByText("ICMP type must be between 0 and 255")).toBeInTheDocument()
    })

    test("hides the error while the field is edited", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultIcmpType="256" />)

      const typeInput = screen.getByLabelText(/ICMP Type/i)
      fireEvent.blur(typeInput)
      expect(await screen.findByText("ICMP type must be between 0 and 255")).toBeInTheDocument()

      await user.clear(typeInput)
      expect(screen.queryByText("ICMP type must be between 0 and 255")).not.toBeInTheDocument()
    })
  })

  describe("Initial values", () => {
    test("displays initial ICMP type value", () => {
      render(<TestWrapper defaultIcmpType="8" />)
      const typeInput = screen.getByLabelText(/ICMP Type/i)
      expect(typeInput).toHaveValue("8")
    })

    test("displays initial ICMP code value", () => {
      render(<TestWrapper defaultIcmpCode="0" />)
      const codeInput = screen.getByLabelText(/ICMP Code/i)
      expect(codeInput).toHaveValue("0")
    })

    test("displays both type and code when provided", () => {
      render(<TestWrapper defaultIcmpType="8" defaultIcmpCode="0" />)
      const typeInput = screen.getByLabelText(/ICMP Type/i)
      const codeInput = screen.getByLabelText(/ICMP Code/i)

      expect(typeInput).toHaveValue("8")
      expect(codeInput).toHaveValue("0")
    })
  })
})
