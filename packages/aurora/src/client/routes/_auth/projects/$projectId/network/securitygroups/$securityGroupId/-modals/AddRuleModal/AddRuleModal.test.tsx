import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
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
      <select
        data-testid="rule-type-select"
        onChange={(e) => {
          form.setFieldValue("ruleType", e.target.value)
          form.setFieldValue("protocol", e.target.value.endsWith("icmp") ? "icmp" : "tcp")
        }}
      >
        <option value="">Select</option>
        <option value="ssh">SSH</option>
        <option value="custom-tcp">Custom TCP</option>
        <option value="custom-icmp">Custom ICMP</option>
        <option value="all-icmp">All ICMP</option>
      </select>
    </div>
  ),
}))

vi.mock("./sections/DirectionEthertypeSection", () => ({
  DirectionSection: () => <div data-testid="direction-section">Direction Section</div>,
  EthertypeSection: ({ form }: { form: AddRuleFormApi }) => (
    <div data-testid="ethertype-section">
      <button type="button" onClick={() => form.setFieldValue("ethertype", "IPv6")}>
        Pick IPv6
      </button>
    </div>
  ),
}))

vi.mock("./sections/ProtocolSection", () => ({
  ProtocolSection: () => <div data-testid="protocol-section">Protocol Section</div>,
}))

vi.mock("./sections/PortRangeSection", () => ({
  PortRangeSection: ({ readOnly }: { readOnly?: boolean }) => (
    <div data-testid="port-range-section" data-readonly={String(Boolean(readOnly))}>
      Port Range Section
    </div>
  ),
}))

vi.mock("./sections/IcmpSection", () => ({
  IcmpSection: () => <div data-testid="icmp-section">ICMP Section</div>,
}))

vi.mock("./sections/RemoteSourceSection", () => ({
  RemoteSourceSection: ({
    form,
    availableSecurityGroups,
  }: {
    form: AddRuleFormApi
    availableSecurityGroups?: Array<{ id: string; name: string | null }>
  }) => (
    <div data-testid="remote-source-section">
      Remote Source Section
      {availableSecurityGroups && <span data-testid="security-groups-count">{availableSecurityGroups.length}</span>}
      <button type="button" onClick={() => form.setFieldValue("remoteCidr", "::/0")}>
        Use IPv6 CIDR
      </button>
      <button type="button" onClick={() => form.setFieldValue("remoteCidr", "")}>
        Clear CIDR
      </button>
      <button
        type="button"
        onClick={() => {
          form.setFieldValue("remoteSourceType", "security_group")
          form.setFieldValue("remoteSecurityGroupId", "sg-other")
        }}
      >
        Use security group
      </button>
    </div>
  ),
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
  onCreate?: (ruleData: Omit<CreateSecurityGroupRuleInput, "project_id">) => Promise<void>
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

const getAddRuleButton = () => screen.getByRole("button", { name: "Add Rule" })

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
      // Rule type section is always visible
      expect(screen.getByTestId("rule-type-section")).toBeInTheDocument()
      // Other sections (direction, protocol, remote-source, description) render conditionally after rule type is selected
    })

    test("explains what a rule consists of", () => {
      renderModal()
      expect(
        screen.getByText(
          "Rules define which traffic is allowed to instances assigned to the security group. A security group rule consists of three main parts: Type, Port Range and Remote."
        )
      ).toBeInTheDocument()
    })

    test("hides the explanation while the rule is being created", () => {
      renderModal({ isLoading: true })
      expect(screen.queryByText(/Rules define which traffic is allowed/)).not.toBeInTheDocument()
    })

    test("renders Add Rule and Cancel buttons", () => {
      renderModal()
      expect(getAddRuleButton()).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })
  })

  describe("Submission", () => {
    test("disables Add Rule until a rule type is selected", async () => {
      const user = userEvent.setup()
      renderModal()

      expect(getAddRuleButton()).toBeDisabled()

      await user.selectOptions(screen.getByTestId("rule-type-select"), "ssh")
      expect(getAddRuleButton()).toBeEnabled()
    })

    test("calls onCreate with the rule and closes on success", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onCreate, onClose })

      await user.selectOptions(screen.getByTestId("rule-type-select"), "ssh")
      await user.click(getAddRuleButton())

      await waitFor(() =>
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            security_group_id: "sg-123",
            direction: "ingress",
            ethertype: "IPv4",
            remote_ip_prefix: "0.0.0.0/0",
            description: undefined,
          })
        )
      )
      await waitFor(() => expect(onClose).toHaveBeenCalled())
    })

    test("takes the IP version from an IPv6 CIDR", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      await user.selectOptions(screen.getByTestId("rule-type-select"), "ssh")
      expect(screen.queryByTestId("ethertype-section")).not.toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Use IPv6 CIDR" }))
      await user.click(getAddRuleButton())

      await waitFor(() =>
        expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ ethertype: "IPv6", remote_ip_prefix: "::/0" }))
      )
    })

    test("sends IPv4 when the CIDR is left empty", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      await user.selectOptions(screen.getByTestId("rule-type-select"), "ssh")
      await user.click(screen.getByRole("button", { name: "Clear CIDR" }))
      await user.click(getAddRuleButton())

      await waitFor(() =>
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({ ethertype: "IPv4", remote_ip_prefix: undefined })
        )
      )
    })

    test("sends the chosen IP version for a security group remote", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      await user.selectOptions(screen.getByTestId("rule-type-select"), "ssh")
      await user.click(screen.getByRole("button", { name: "Use security group" }))
      await user.click(screen.getByRole("button", { name: "Pick IPv6" }))
      await user.click(getAddRuleButton())

      await waitFor(() =>
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({ ethertype: "IPv6", remote_group_id: "sg-other", remote_ip_prefix: undefined })
        )
      )
    })

    test("stays open when creation fails", async () => {
      const onCreate = vi.fn().mockRejectedValue(new Error("Quota exceeded"))
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onCreate, onClose })

      await user.selectOptions(screen.getByTestId("rule-type-select"), "ssh")
      await user.click(getAddRuleButton())

      await waitFor(() => expect(onCreate).toHaveBeenCalled())
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByTestId("rule-type-select")).toHaveValue("ssh")
    })
  })

  describe("Port fields", () => {
    test("shows a preset's ports read-only", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.selectOptions(screen.getByTestId("rule-type-select"), "ssh")

      expect(screen.getByTestId("port-range-section")).toHaveAttribute("data-readonly", "true")
    })

    test("lets the user edit the ports of a custom TCP rule", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.selectOptions(screen.getByTestId("rule-type-select"), "custom-tcp")

      expect(screen.getByTestId("port-range-section")).toHaveAttribute("data-readonly", "false")
    })
  })

  describe("ICMP fields", () => {
    test("shows ICMP type and code for a custom ICMP rule", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.selectOptions(screen.getByTestId("rule-type-select"), "custom-icmp")

      expect(screen.getByTestId("icmp-section")).toBeInTheDocument()
    })

    test("hides ICMP type and code for All ICMP", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.selectOptions(screen.getByTestId("rule-type-select"), "all-icmp")

      expect(screen.getByTestId("direction-section")).toBeInTheDocument()
      expect(screen.queryByTestId("icmp-section")).not.toBeInTheDocument()
    })

    test("sends an All ICMP rule without type and code", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onCreate })

      await user.selectOptions(screen.getByTestId("rule-type-select"), "all-icmp")
      await user.click(getAddRuleButton())

      await waitFor(() => expect(onCreate).toHaveBeenCalled())
      const payload = onCreate.mock.calls[0][0]
      expect(payload.protocol).toBe("icmp")
      expect(payload.port_range_min).toBeUndefined()
      expect(payload.port_range_max).toBeUndefined()
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
    test("shows loading state when isLoading is true", () => {
      renderModal({ isLoading: true })
      expect(screen.getByText(/Creating Security Group Rule.../i)).toBeInTheDocument()
    })

    test("disables buttons when isLoading is true", () => {
      renderModal({ isLoading: true })
      expect(getAddRuleButton()).toBeDisabled()
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

    test("resets form when modal is closed and reopened", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()

      // Initial render with modal open
      const { rerender } = render(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <AddRuleModal securityGroupId="sg-123" open={true} onClose={onClose} onCreate={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )

      // Interact with form - change from the empty default to "custom-tcp"
      const ruleTypeSelect = screen.getByTestId("rule-type-select")
      expect(ruleTypeSelect).toHaveValue("") // Verify default

      await user.selectOptions(ruleTypeSelect, "custom-tcp")
      expect(ruleTypeSelect).toHaveValue("custom-tcp") // Verify change

      // Close modal by clicking Cancel
      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()

      // Simulate parent component closing the modal (open=false)
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <AddRuleModal securityGroupId="sg-123" open={false} onClose={onClose} onCreate={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )

      // Reopen modal (open=true) - form should be reset
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <AddRuleModal securityGroupId="sg-123" open={true} onClose={onClose} onCreate={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )

      // Verify form has reset to default values
      const ruleTypeSelectAfterReopen = screen.getByTestId("rule-type-select")
      expect(ruleTypeSelectAfterReopen).toHaveValue("") // Should be back to default
    })
  })

  describe("Available security groups", () => {
    test("passes availableSecurityGroups to RemoteSourceSection when rule type is selected", async () => {
      const user = userEvent.setup()
      const mockSecurityGroups = [
        { id: "sg-1", name: "Group 1" },
        { id: "sg-2", name: "Group 2" },
      ]
      renderModal({ availableSecurityGroups: mockSecurityGroups })

      // Initially, remote source section is not visible (no rule type selected)
      expect(screen.queryByTestId("remote-source-section")).not.toBeInTheDocument()

      // Select a rule type to make the section visible
      const ruleTypeSelect = screen.getByTestId("rule-type-select")
      await user.selectOptions(ruleTypeSelect, "ssh")

      // Now the RemoteSourceSection should be visible with the security groups
      expect(screen.getByTestId("remote-source-section")).toBeInTheDocument()
      expect(screen.getByTestId("security-groups-count")).toHaveTextContent("2")
    })
  })
})
