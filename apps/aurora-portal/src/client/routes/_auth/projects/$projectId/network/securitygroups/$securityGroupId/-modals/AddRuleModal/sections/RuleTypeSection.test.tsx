import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { useForm } from "@tanstack/react-form"
import { RuleTypeSection } from "./RuleTypeSection"
import { DEFAULT_VALUES } from "../types"
import { createRuleFormSchema } from "../validation/formSchema"

// ─── Test wrapper component ───────────────────────────────────────────────────

function TestWrapper({ disabled = false, defaultRuleType = "ssh" }: { disabled?: boolean; defaultRuleType?: string }) {
  const form = useForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      ruleType: defaultRuleType,
    },
    validators: {
      onSubmit: createRuleFormSchema,
    },
    onSubmit: async () => {},
  })

  return (
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <RuleTypeSection form={form} disabled={disabled} />
      </PortalProvider>
    </I18nProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RuleTypeSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    test("renders Rule Type select", () => {
      render(<TestWrapper />)
      expect(screen.getByLabelText(/Rule Type/i)).toBeInTheDocument()
    })

    test("renders with default SSH rule type", () => {
      render(<TestWrapper />)
      // Check that SSH is visible in the button (Juno Select renders button + dropdown)
      const sshElements = screen.getAllByText(/SSH/i)
      expect(sshElements.length).toBeGreaterThan(0)
    })

    test("renders custom rule options", () => {
      render(<TestWrapper />)
      // Check select is present
      const select = screen.getByLabelText(/Rule Type/i)
      expect(select).toBeInTheDocument()

      // Check some key options are available by checking they exist in the document
      const sshElements = screen.getAllByText(/SSH/i)
      expect(sshElements.length).toBeGreaterThan(0)
    })
  })

  describe("User interactions", () => {
    test("allows selecting a different rule type", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const select = screen.getByLabelText(/Rule Type/i)
      await user.click(select)

      // Find and click HTTP option (use getAllByText since it appears in both button and dropdown)
      const httpOptions = screen.getAllByText(/^HTTP$/i)
      await user.click(httpOptions[httpOptions.length - 1]) // Click the last one (in dropdown)

      await waitFor(() => {
        // Verify HTTP is now visible/selected
        const httpElements = screen.getAllByText(/^HTTP$/i)
        expect(httpElements.length).toBeGreaterThan(0)
      })
    })

    test("can be disabled", () => {
      render(<TestWrapper disabled={true} />)
      const select = screen.getByLabelText(/Rule Type/i) as HTMLSelectElement
      expect(select).toBeDisabled()
    })
  })

  describe("Initial values", () => {
    test("displays custom rule type when provided", () => {
      render(<TestWrapper defaultRuleType="custom-tcp" />)
      // Check that Custom TCP Rule is visible (use getAllByText since Select renders it multiple times)
      const customTcpElements = screen.getAllByText(/Custom TCP Rule/i)
      expect(customTcpElements.length).toBeGreaterThan(0)
    })

    test("displays HTTPS rule type when provided", () => {
      render(<TestWrapper defaultRuleType="https" />)
      // Check that HTTPS is visible (use getAllByText since Select renders it multiple times)
      const httpsElements = screen.getAllByText(/HTTPS/i)
      expect(httpsElements.length).toBeGreaterThan(0)
    })
  })
})
