import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { useForm } from "@tanstack/react-form"
import { PortRangeSection } from "./PortRangeSection"
import { DEFAULT_VALUES } from "../types"
import { createRuleFormSchema } from "../validation/formSchema"

// ─── Test wrapper component ───────────────────────────────────────────────────

function TestWrapper({
  disabled = false,
  defaultPortFrom = "",
  defaultPortTo = "",
}: {
  disabled?: boolean
  defaultPortFrom?: string
  defaultPortTo?: string
}) {
  const form = useForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      portFrom: defaultPortFrom,
      portTo: defaultPortTo,
    },
    validators: {
      onSubmit: createRuleFormSchema,
    },
    onSubmit: async () => {},
  })

  return (
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <PortRangeSection form={form} disabled={disabled} />
      </PortalProvider>
    </I18nProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PortRangeSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    test("renders Port (from) and Port (to) inputs", () => {
      render(<TestWrapper />)
      expect(screen.getByLabelText(/Port \(from\)/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Port \(to\)/i)).toBeInTheDocument()
    })

    test("renders help text", () => {
      render(<TestWrapper />)
      expect(
        screen.getByText(/Enter a single port, or define a range by also filling "Port \(to\)"/i)
      ).toBeInTheDocument()
    })
  })

  describe("Port (from) input", () => {
    test("accepts numeric input", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      await user.type(portFromInput, "8080")

      expect(portFromInput).toHaveValue("8080")
    })

    test("can be disabled", () => {
      render(<TestWrapper disabled={true} />)
      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      expect(portFromInput).toBeDisabled()
    })
  })

  describe("Port (to) input", () => {
    test("is disabled when Port (from) is empty", () => {
      render(<TestWrapper defaultPortFrom="" />)
      const portToInput = screen.getByLabelText(/Port \(to\)/i)
      expect(portToInput).toBeDisabled()
    })

    test("is enabled when Port (from) has a value", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      await user.type(portFromInput, "8080")

      await waitFor(() => {
        const portToInput = screen.getByLabelText(/Port \(to\)/i)
        expect(portToInput).not.toBeDisabled()
      })
    })

    test("accepts numeric input when enabled", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultPortFrom="8080" />)

      const portToInput = screen.getByLabelText(/Port \(to\)/i)
      await user.type(portToInput, "9090")

      expect(portToInput).toHaveValue("9090")
    })

    test("is disabled when Port (from) is whitespace", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      await user.type(portFromInput, "   ")

      await waitFor(() => {
        const portToInput = screen.getByLabelText(/Port \(to\)/i)
        expect(portToInput).toBeDisabled()
      })
    })
  })

  describe("Cross-field behavior", () => {
    test("clears Port (to) when Port (from) is cleared", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultPortFrom="8080" defaultPortTo="9090" />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      await user.clear(portFromInput)

      await waitFor(() => {
        const portToInput = screen.getByLabelText(/Port \(to\)/i) as HTMLInputElement
        expect(portToInput.value).toBe("")
      })
    })

    test("clears Port (to) when Port (from) becomes whitespace", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultPortFrom="8080" defaultPortTo="9090" />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      await user.clear(portFromInput)
      await user.type(portFromInput, "   ")

      await waitFor(() => {
        const portToInput = screen.getByLabelText(/Port \(to\)/i) as HTMLInputElement
        expect(portToInput.value).toBe("")
      })
    })
  })

  describe("Disabled state", () => {
    test("disables all inputs when disabled prop is true", () => {
      render(<TestWrapper disabled={true} />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      const portToInput = screen.getByLabelText(/Port \(to\)/i)

      expect(portFromInput).toBeDisabled()
      expect(portToInput).toBeDisabled()
    })

    test("Port (to) is disabled when both disabled prop is true and Port (from) is empty", () => {
      render(<TestWrapper disabled={true} defaultPortFrom="" />)
      const portToInput = screen.getByLabelText(/Port \(to\)/i)
      expect(portToInput).toBeDisabled()
    })
  })

  describe("Initial values", () => {
    test("displays initial Port (from) value", () => {
      render(<TestWrapper defaultPortFrom="8080" />)
      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      expect(portFromInput).toHaveValue("8080")
    })

    test("displays initial Port (to) value", () => {
      render(<TestWrapper defaultPortFrom="8080" defaultPortTo="9090" />)
      const portToInput = screen.getByLabelText(/Port \(to\)/i)
      expect(portToInput).toHaveValue("9090")
    })
  })
})
