import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, fireEvent, within } from "@testing-library/react"
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
  readOnly = false,
  defaultPortFrom = "",
  defaultPortTo = "",
}: {
  disabled?: boolean
  readOnly?: boolean
  defaultPortFrom?: string
  defaultPortTo?: string
}) {
  const form = useForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      ruleType: "custom-tcp",
      protocol: "tcp" as string | null,
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
        <PortRangeSection form={form} disabled={disabled} readOnly={readOnly} />
      </PortalProvider>
    </I18nProvider>
  )
}

// Juno TextInput renders its hints inside this wrapper, so it tells which input owns an error
const fieldOf = (input: HTMLElement) => within(input.closest<HTMLElement>(".juno-textinput-outer-wrapper")!)

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
      expect(screen.getByText("Single port or start of a range, 1-65535.")).toBeInTheDocument()
      expect(screen.getByText("End of the range. Leave empty for a single port.")).toBeInTheDocument()
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

  describe("Validation", () => {
    test("shows the required error when Port (from) is left empty", async () => {
      render(<TestWrapper />)

      fireEvent.blur(screen.getByLabelText(/Port \(from\)/i))

      expect(await screen.findByText("Port (from) is required")).toBeInTheDocument()
    })

    test("shows the range error once Port (from) is left", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      await user.type(portFromInput, "70000")
      expect(screen.queryByText("For TCP/UDP: port must be between 1 and 65535")).not.toBeInTheDocument()

      fireEvent.blur(portFromInput)
      expect(await screen.findByText("For TCP/UDP: port must be between 1 and 65535")).toBeInTheDocument()
    })

    test("shows the order error under Port (to) once it is left", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultPortFrom="9090" />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      const portToInput = screen.getByLabelText(/Port \(to\)/i)
      await user.type(portToInput, "80")
      expect(screen.queryByText('"Port (from)" must be less than "Port (to)"')).not.toBeInTheDocument()

      fireEvent.blur(portToInput)
      expect(await fieldOf(portToInput).findByText('"Port (from)" must be less than "Port (to)"')).toBeInTheDocument()
      expect(fieldOf(portFromInput).queryByText('"Port (from)" must be less than "Port (to)"')).not.toBeInTheDocument()
    })

    test("shows an out-of-range Port (to) under Port (to), not under a valid Port (from)", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultPortFrom="80" />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      const portToInput = screen.getByLabelText(/Port \(to\)/i)
      fireEvent.blur(portFromInput)
      await user.type(portToInput, "70000")
      fireEvent.blur(portToInput)

      expect(await fieldOf(portToInput).findByText("For TCP/UDP: port must be between 1 and 65535")).toBeInTheDocument()
      expect(
        fieldOf(portFromInput).queryByText("For TCP/UDP: port must be between 1 and 65535")
      ).not.toBeInTheDocument()
    })

    test("shows an out-of-range Port (from) under Port (from) when a range is entered", async () => {
      render(<TestWrapper defaultPortFrom="70000" defaultPortTo="80" />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      const portToInput = screen.getByLabelText(/Port \(to\)/i)
      fireEvent.blur(portFromInput)
      fireEvent.blur(portToInput)

      expect(
        await fieldOf(portFromInput).findByText("For TCP/UDP: port must be between 1 and 65535")
      ).toBeInTheDocument()
      // The order check needs a valid Port (from), so Port (to) shows nothing
      expect(fieldOf(portToInput).queryByText('"Port (from)" must be less than "Port (to)"')).not.toBeInTheDocument()
    })

    test("hides the error while the port is edited", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultPortFrom="70000" />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      fireEvent.blur(portFromInput)
      expect(await screen.findByText("For TCP/UDP: port must be between 1 and 65535")).toBeInTheDocument()

      await user.type(portFromInput, "{Backspace}")
      expect(screen.queryByText("For TCP/UDP: port must be between 1 and 65535")).not.toBeInTheDocument()
    })
  })

  describe("Read-only (preset) state", () => {
    test("shows the preset port in disabled fields", () => {
      render(<TestWrapper readOnly defaultPortFrom="80" />)

      const portFromInput = screen.getByLabelText(/Port \(from\)/i)
      const portToInput = screen.getByLabelText(/Port \(to\)/i)
      expect(portFromInput).toHaveValue("80")
      expect(portFromInput).toBeDisabled()
      expect(portToInput).toHaveValue("")
      expect(portToInput).toBeDisabled()
    })

    test("shows a preset port range", () => {
      render(<TestWrapper readOnly defaultPortFrom="1" defaultPortTo="65535" />)

      expect(screen.getByLabelText(/Port \(from\)/i)).toHaveValue("1")
      expect(screen.getByLabelText(/Port \(to\)/i)).toHaveValue("65535")
    })

    test("explains how to change the ports instead of the input hints", () => {
      render(<TestWrapper readOnly defaultPortFrom="80" />)

      expect(
        screen.getByText("Set by the preset. Use a custom TCP or UDP rule to change the ports.")
      ).toBeInTheDocument()
      expect(screen.queryByText("Single port or start of a range, 1-65535.")).not.toBeInTheDocument()
      expect(screen.queryByText("End of the range. Leave empty for a single port.")).not.toBeInTheDocument()
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
