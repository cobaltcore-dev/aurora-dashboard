import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { useForm } from "@tanstack/react-form"
import { RemoteSourceSection } from "./RemoteSourceSection"
import { DEFAULT_VALUES } from "../types"
import { createRuleFormSchema } from "../validation/formSchema"
import { showAllRuleFieldErrors } from "../validation/fieldErrors"

// ─── Test wrapper component ───────────────────────────────────────────────────

function TestWrapper({
  disabled = false,
  defaultRemoteSourceType = "cidr",
  defaultRemoteCidr = "0.0.0.0/0",
  defaultRemoteSecurityGroupId = "",
  defaultEthertype = "IPv4",
  availableSecurityGroups = [],
}: {
  disabled?: boolean
  defaultRemoteSourceType?: "cidr" | "security_group"
  defaultRemoteCidr?: string
  defaultRemoteSecurityGroupId?: string
  defaultEthertype?: "IPv4" | "IPv6"
  availableSecurityGroups?: Array<{ id: string; name: string | null }>
}) {
  const form = useForm({
    defaultValues: {
      ...DEFAULT_VALUES,
      remoteSourceType: defaultRemoteSourceType,
      remoteCidr: defaultRemoteCidr,
      remoteSecurityGroupId: defaultRemoteSecurityGroupId,
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
        <RemoteSourceSection form={form} disabled={disabled} availableSecurityGroups={availableSecurityGroups} />
        {/* Stands in for the modal's submit, which reveals the errors of all rendered fields */}
        <button type="button" onClick={() => showAllRuleFieldErrors(form)}>
          Show errors
        </button>
      </PortalProvider>
    </I18nProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RemoteSourceSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    test("renders Remote label", () => {
      render(<TestWrapper />)
      expect(screen.getByText("Remote")).toBeInTheDocument()
    })

    test("renders CIDR and Security Group radio options", () => {
      render(<TestWrapper />)
      expect(screen.getByLabelText(/^CIDR$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Security Group/i)).toBeInTheDocument()
    })

    test("CIDR is selected by default", () => {
      render(<TestWrapper />)
      const cidrRadio = screen.getByLabelText(/^CIDR$/i) as HTMLInputElement
      expect(cidrRadio.checked).toBe(true)
    })
  })

  describe("CIDR mode", () => {
    test("shows CIDR input when CIDR is selected", () => {
      render(<TestWrapper defaultRemoteSourceType="cidr" />)
      expect(screen.getByLabelText(/Remote IP Prefix/i)).toBeInTheDocument()
    })

    test("does not show Security Group select when CIDR is selected", () => {
      render(<TestWrapper defaultRemoteSourceType="cidr" />)
      expect(screen.queryByLabelText(/Remote Security Group/i)).not.toBeInTheDocument()
    })

    test("displays default CIDR value", () => {
      render(<TestWrapper defaultRemoteCidr="0.0.0.0/0" />)
      const cidrInput = screen.getByLabelText(/Remote IP Prefix/i) as HTMLInputElement
      expect(cidrInput.value).toBe("0.0.0.0/0")
    })

    test("accepts CIDR input", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultRemoteCidr="" />)

      const cidrInput = screen.getByLabelText(/Remote IP Prefix/i)
      await user.type(cidrInput, "192.168.1.0/24")

      expect(cidrInput).toHaveValue("192.168.1.0/24")
    })

    test("explains the CIDR format and what an empty field means", () => {
      render(<TestWrapper />)
      expect(
        screen.getByText("IPv4 or IPv6 CIDR, e.g. 10.0.0.0/24 or ::/0. Leave empty to allow any IPv4 address.")
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          "The other end of the traffic: where it comes from (ingress) or where it goes to (egress). CIDR is recommended."
        )
      ).toBeInTheDocument()
    })

    test("shows the format error once the field is left", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultRemoteCidr="" />)

      const cidrInput = screen.getByLabelText(/Remote IP Prefix/i)
      await user.type(cidrInput, "10.0.0")
      expect(screen.queryByText(/Invalid CIDR format/)).not.toBeInTheDocument()

      fireEvent.blur(cidrInput)
      expect(await screen.findByText(/Invalid CIDR format/)).toBeInTheDocument()
    })

    test("hides the format error while the field is edited", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultRemoteCidr="10.0.0" />)

      const cidrInput = screen.getByLabelText(/Remote IP Prefix/i)
      fireEvent.blur(cidrInput)
      expect(await screen.findByText(/Invalid CIDR format/)).toBeInTheDocument()

      await user.type(cidrInput, ".")
      expect(screen.queryByText(/Invalid CIDR format/)).not.toBeInTheDocument()
    })
  })

  describe("Security Group mode", () => {
    test("shows Security Group select when Security Group is selected", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultRemoteSourceType="cidr" />)

      const sgRadio = screen.getByLabelText(/Security Group/i)
      await user.click(sgRadio)

      await waitFor(() => {
        expect(screen.getByLabelText(/Remote Security Group/i)).toBeInTheDocument()
      })
    })

    test("does not show CIDR input when Security Group is selected", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultRemoteSourceType="cidr" />)

      const sgRadio = screen.getByLabelText(/Security Group/i)
      await user.click(sgRadio)

      await waitFor(() => {
        expect(screen.queryByLabelText(/Remote IP Prefix/i)).not.toBeInTheDocument()
      })
    })

    test("renders Security Group options", () => {
      const mockGroups = [
        { id: "sg-1", name: "Group 1" },
        { id: "sg-2", name: "Group 2" },
        { id: "sg-3", name: null },
      ]
      render(<TestWrapper defaultRemoteSourceType="security_group" availableSecurityGroups={mockGroups} />)

      expect(screen.getByText("Group 1")).toBeInTheDocument()
      expect(screen.getByText("Group 2")).toBeInTheDocument()
      expect(screen.getByText("sg-3")).toBeInTheDocument() // Falls back to ID when name is null
    })

    test("is required and explains what the group grants", () => {
      render(<TestWrapper defaultRemoteSourceType="security_group" />)
      expect(screen.getByText("Applies to traffic to or from any instance in the selected group.")).toBeInTheDocument()
    })

    test("shows the required error on submit when no group is selected", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultRemoteSourceType="security_group" />)
      expect(screen.queryByText("Remote security group is required")).not.toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Show errors" }))

      expect(await screen.findByText("Remote security group is required")).toBeInTheDocument()
    })

    test("does not require a group in CIDR mode", async () => {
      const user = userEvent.setup()
      render(<TestWrapper />)

      await user.click(screen.getByRole("button", { name: "Show errors" }))

      expect(screen.queryByText("Remote security group is required")).not.toBeInTheDocument()
    })

    test("does not offer the placeholder as an option", async () => {
      const user = userEvent.setup()
      const mockGroups = [{ id: "sg-1", name: "Group 1" }]
      render(<TestWrapper defaultRemoteSourceType="security_group" availableSecurityGroups={mockGroups} />)

      await user.click(screen.getByLabelText(/Remote Security Group/i))

      expect(screen.getByRole("option", { name: "Group 1" })).toBeInTheDocument()
      expect(screen.queryByRole("option", { name: "Select a security group..." })).not.toBeInTheDocument()
    })

    test("shows placeholder option", () => {
      render(<TestWrapper defaultRemoteSourceType="security_group" />)
      const placeholderOptions = screen.getAllByText(/Select a security group.../i)
      expect(placeholderOptions.length).toBeGreaterThan(0)
    })

    test("allows selecting a security group", async () => {
      const user = userEvent.setup()
      const mockGroups = [{ id: "sg-1", name: "Group 1" }]
      render(<TestWrapper defaultRemoteSourceType="security_group" availableSecurityGroups={mockGroups} />)

      const select = screen.getByLabelText(/Remote Security Group/i)
      await user.click(select)

      // Find the option by text
      const options = screen.getAllByText("Group 1")
      await user.click(options[0])

      await waitFor(() => {
        // Verify Group 1 is now selected by checking it's visible as the button label
        expect(screen.getAllByText("Group 1").length).toBeGreaterThan(0)
      })
    })
  })

  describe("Radio toggle behavior", () => {
    test("switches from CIDR to Security Group", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultRemoteSourceType="cidr" />)

      // Initially shows CIDR input
      expect(screen.getByLabelText(/Remote IP Prefix/i)).toBeInTheDocument()

      // Click Security Group radio
      const sgRadio = screen.getByLabelText(/Security Group/i)
      await user.click(sgRadio)

      // Should now show Security Group select
      await waitFor(() => {
        expect(screen.queryByLabelText(/Remote IP Prefix/i)).not.toBeInTheDocument()
        expect(screen.getByLabelText(/Remote Security Group/i)).toBeInTheDocument()
      })
    })

    test("switches from Security Group to CIDR", async () => {
      const user = userEvent.setup()
      render(<TestWrapper defaultRemoteSourceType="security_group" />)

      // Initially shows Security Group select
      expect(screen.getByLabelText(/Remote Security Group/i)).toBeInTheDocument()

      // Click CIDR radio
      const cidrRadio = screen.getByLabelText(/^CIDR$/i)
      await user.click(cidrRadio)

      // Should now show CIDR input
      await waitFor(() => {
        expect(screen.queryByLabelText(/Remote Security Group/i)).not.toBeInTheDocument()
        expect(screen.getByLabelText(/Remote IP Prefix/i)).toBeInTheDocument()
      })
    })
  })

  describe("Disabled state", () => {
    test("disables radio buttons when disabled", () => {
      render(<TestWrapper disabled={true} />)
      const cidrRadio = screen.getByLabelText(/^CIDR$/i) as HTMLInputElement
      const sgRadio = screen.getByLabelText(/Security Group/i) as HTMLInputElement

      expect(cidrRadio).toBeDisabled()
      expect(sgRadio).toBeDisabled()
    })

    test("disables CIDR input when disabled", () => {
      render(<TestWrapper disabled={true} defaultRemoteSourceType="cidr" />)
      const cidrInput = screen.getByLabelText(/Remote IP Prefix/i)
      expect(cidrInput).toBeDisabled()
    })

    test("disables Security Group select when disabled", () => {
      render(<TestWrapper disabled={true} defaultRemoteSourceType="security_group" />)
      const select = screen.getByLabelText(/Remote Security Group/i)
      expect(select).toBeDisabled()
    })
  })
})
