import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { useForm } from "@tanstack/react-form"
import { DirectionSection, EthertypeSection } from "./DirectionEthertypeSection"
import { DEFAULT_VALUES } from "../types"
import { createRuleFormSchema } from "../validation/formSchema"

// ─── Test wrapper components ──────────────────────────────────────────────────

function DirectionTestWrapper({
  disabled = false,
  defaultDirection = "ingress",
}: {
  disabled?: boolean
  defaultDirection?: "ingress" | "egress"
}) {
  const form = useForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      direction: defaultDirection,
    },
    validators: {
      onSubmit: createRuleFormSchema,
    },
    onSubmit: async () => {},
  })

  return (
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DirectionSection form={form} disabled={disabled} />
      </PortalProvider>
    </I18nProvider>
  )
}

function EthertypeTestWrapper({
  disabled = false,
  defaultEthertype = "IPv4",
}: {
  disabled?: boolean
  defaultEthertype?: "IPv4" | "IPv6"
}) {
  const form = useForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      ethertype: defaultEthertype,
    },
    validators: {
      onSubmit: createRuleFormSchema,
    },
    onSubmit: async () => {},
  })

  return (
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EthertypeSection form={form} disabled={disabled} />
      </PortalProvider>
    </I18nProvider>
  )
}

// ─── DirectionSection Tests ───────────────────────────────────────────────────

describe("DirectionSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    test("renders Direction label", () => {
      render(<DirectionTestWrapper />)
      expect(screen.getByText("Direction")).toBeInTheDocument()
    })

    test("renders Ingress and Egress radio options", () => {
      render(<DirectionTestWrapper />)
      expect(screen.getByLabelText(/Ingress/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Egress/i)).toBeInTheDocument()
    })

    test("Ingress is selected by default", () => {
      render(<DirectionTestWrapper />)
      const ingressRadio = screen.getByLabelText(/Ingress/i) as HTMLInputElement
      expect(ingressRadio.checked).toBe(true)
    })
  })

  describe("User interactions", () => {
    test("allows selecting Egress", async () => {
      const user = userEvent.setup()
      render(<DirectionTestWrapper />)

      const egressRadio = screen.getByLabelText(/Egress/i)
      await user.click(egressRadio)

      expect(egressRadio).toBeChecked()
    })

    test("can switch from Egress back to Ingress", async () => {
      const user = userEvent.setup()
      render(<DirectionTestWrapper defaultDirection="egress" />)

      const ingressRadio = screen.getByLabelText(/Ingress/i)
      await user.click(ingressRadio)

      expect(ingressRadio).toBeChecked()
    })
  })

  describe("Disabled state", () => {
    test("disables both radio options when disabled", () => {
      render(<DirectionTestWrapper disabled={true} />)
      const ingressRadio = screen.getByLabelText(/Ingress/i) as HTMLInputElement
      const egressRadio = screen.getByLabelText(/Egress/i) as HTMLInputElement

      expect(ingressRadio).toBeDisabled()
      expect(egressRadio).toBeDisabled()
    })
  })
})

// ─── EthertypeSection Tests ───────────────────────────────────────────────────

describe("EthertypeSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    test("renders IP Version label", () => {
      render(<EthertypeTestWrapper />)
      expect(screen.getByText("IP Version")).toBeInTheDocument()
    })

    test("renders IPv4 and IPv6 radio options", () => {
      render(<EthertypeTestWrapper />)
      expect(screen.getByLabelText(/IPv4/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/IPv6/i)).toBeInTheDocument()
    })

    test("IPv4 is selected by default", () => {
      render(<EthertypeTestWrapper />)
      const ipv4Radio = screen.getByLabelText(/IPv4/i) as HTMLInputElement
      expect(ipv4Radio.checked).toBe(true)
    })
  })

  describe("User interactions", () => {
    test("allows selecting IPv6", async () => {
      const user = userEvent.setup()
      render(<EthertypeTestWrapper />)

      const ipv6Radio = screen.getByLabelText(/IPv6/i)
      await user.click(ipv6Radio)

      expect(ipv6Radio).toBeChecked()
    })

    test("can switch from IPv6 back to IPv4", async () => {
      const user = userEvent.setup()
      render(<EthertypeTestWrapper defaultEthertype="IPv6" />)

      const ipv4Radio = screen.getByLabelText(/IPv4/i)
      await user.click(ipv4Radio)

      expect(ipv4Radio).toBeChecked()
    })
  })

  describe("Disabled state", () => {
    test("disables both radio options when disabled", () => {
      render(<EthertypeTestWrapper disabled={true} />)
      const ipv4Radio = screen.getByLabelText(/IPv4/i) as HTMLInputElement
      const ipv6Radio = screen.getByLabelText(/IPv6/i) as HTMLInputElement

      expect(ipv4Radio).toBeDisabled()
      expect(ipv6Radio).toBeDisabled()
    })
  })

  describe("Initial values", () => {
    test("displays IPv6 when provided", () => {
      render(<EthertypeTestWrapper defaultEthertype="IPv6" />)
      const ipv6Radio = screen.getByLabelText(/IPv6/i) as HTMLInputElement
      expect(ipv6Radio.checked).toBe(true)
    })
  })
})
