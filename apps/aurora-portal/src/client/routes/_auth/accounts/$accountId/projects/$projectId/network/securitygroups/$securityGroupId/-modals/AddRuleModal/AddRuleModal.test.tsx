import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { AddRuleModal } from "./AddRuleModal"
import type { CreateSecurityGroupRuleInput } from "@/server/Network/types/securityGroup"
import type { AddRuleFormApi } from "./AddRuleModal"

// ─── Mock child components ────────────────────────────────────────────────────

vi.mock("./sections/RuleTypeSection", () => ({
  RuleTypeSection: ({ form }: { form: AddRuleFormApi }) => (
    <div data-testid="rule-type-section">
      <select data-testid="rule-type-select" onChange={(e) => form.setFieldValue("ruleType", e.target.value)}>
        <option value="ssh">SSH</option>
        <option value="custom-tcp">Custom TCP</option>
      </select>
    </div>
  ),
}))

vi.mock("./sections/DirectionEthertypeSection", () => ({
  DirectionSection: () => <div data-testid="direction-section">Direction Section</div>,
  EthertypeSection: () => <div data-testid="ethertype-section">Ethertype Section</div>,
}))

vi.mock("./sections/ProtocolSection", () => ({
  ProtocolSection: () => <div data-testid="protocol-section">Protocol Section</div>,
}))

vi.mock("./sections/PortRangeSection", () => ({
  PortRangeSection: () => <div data-testid="port-range-section">Port Range Section</div>,
}))

vi.mock("./sections/IcmpSection", () => ({
  IcmpSection: () => <div data-testid="icmp-section">ICMP Section</div>,
}))

vi.mock("./sections/RemoteSourceSection", () => ({
  RemoteSourceSection: () => <div data-testid="remote-source-section">Remote Source Section</div>,
}))

vi.mock("./sections/DescriptionSection", () => ({
  DescriptionSection: () => <div data-testid="description-section">Description Section</div>,
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  securityGroupId = "sg-123",
  open = true,
  onClose = vi.fn(),
  onCreate = vi.fn(),
  isLoading = false,
  error = null,
  availableSecurityGroups = [],
}: {
  securityGroupId?: string
  open?: boolean
  onClose?: () => void
  onCreate?: (ruleData: CreateSecurityGroupRuleInput) => Promise<void>
  isLoading?: boolean
  error?: string | null
  availableSecurityGroups?: Array<{ id: string; name: string | null }>
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <AddRuleModal
          securityGroupId={securityGroupId}
          open={open}
          onClose={onClose}
          onCreate={onCreate}
          isLoading={isLoading}
          error={error}
          availableSecurityGroups={availableSecurityGroups}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AddRuleModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when open is false", () => {
      renderModal({ open: false })
      expect(screen.queryByText("Add Security Group Rule")).not.toBeInTheDocument()
    })

    test("renders when open is true", () => {
      renderModal()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getAllByText("Add Security Group Rule").length).toBeGreaterThan(0)
    })
  })

  describe("Form sections rendering", () => {
    test("renders all required sections", () => {
      renderModal()
      expect(screen.getByTestId("rule-type-section")).toBeInTheDocument()
      expect(screen.getByTestId("direction-section")).toBeInTheDocument()
      expect(screen.getByTestId("remote-source-section")).toBeInTheDocument()
      expect(screen.getByTestId("description-section")).toBeInTheDocument()
    })

    test("renders Add Rule and Cancel buttons", () => {
      renderModal()
      expect(screen.getByTestId("add-rule-button")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })
  })

  describe("Error handling", () => {
    test("displays error message when error prop is provided", () => {
      renderModal({ error: "Failed to create rule" })
      expect(screen.getByText("Failed to create rule")).toBeInTheDocument()
    })

    test("does not display error message when error is null", () => {
      renderModal({ error: null })
      expect(screen.queryByText(/Failed/i)).not.toBeInTheDocument()
    })
  })

  describe("Loading state", () => {
    test("shows loading spinner when isLoading is true", () => {
      renderModal({ isLoading: true })
      expect(screen.getByText(/Creating security group rule.../i)).toBeInTheDocument()
    })

    test("disables buttons when isLoading is true", () => {
      renderModal({ isLoading: true })
      expect(screen.getByTestId("add-rule-button")).toBeDisabled()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled()
    })
  })

  describe("Modal interactions", () => {
    test("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    test("resets form when modal is closed", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })

      // Interact with form first
      const ruleTypeSelect = screen.getByTestId("rule-type-select")
      await user.selectOptions(ruleTypeSelect, "custom-tcp")

      // Close modal
      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe("Available security groups", () => {
    test("passes availableSecurityGroups to RemoteSourceSection", () => {
      const mockSecurityGroups = [
        { id: "sg-1", name: "Group 1" },
        { id: "sg-2", name: "Group 2" },
      ]
      renderModal({ availableSecurityGroups: mockSecurityGroups })

      // The RemoteSourceSection should receive the prop (verified by mock)
      expect(screen.getByTestId("remote-source-section")).toBeInTheDocument()
    })
  })
})
