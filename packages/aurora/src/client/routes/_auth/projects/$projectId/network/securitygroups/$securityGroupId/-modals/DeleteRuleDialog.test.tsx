import { render, screen } from "@testing-library/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { describe, it, expect, vi } from "vitest"
import type { SecurityGroupRule } from "@/server/Network/types/securityGroup"
import { DeleteRuleDialog } from "./DeleteRuleDialog"

vi.mock("@/client/hooks/useModalTracking", () => ({
  useModalTracking: () => ({ trackClose: vi.fn(), markSubmitted: vi.fn(), resetTracking: vi.fn() }),
}))

const renderDialog = (fields: Partial<SecurityGroupRule>) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DeleteRuleDialog
          rule={{ id: "rule-1", direction: "ingress", ethertype: "IPv4", protocol: "tcp", ...fields }}
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          isLoading={false}
          error={null}
          availableSecurityGroups={[{ id: "sg-web", name: "web" }]}
        />
      </PortalProvider>
    </I18nProvider>
  )

describe("DeleteRuleDialog", () => {
  it("shows the remote group by name", () => {
    renderDialog({ remote_group_id: "sg-web" })

    expect(screen.getByText(/Remote/).textContent).toBe("Remote: web")
  })

  it("shows the CIDR of an IP prefix remote", () => {
    renderDialog({ remote_ip_prefix: "10.0.0.0/24" })

    expect(screen.getByText(/Remote/).textContent).toBe("Remote: 10.0.0.0/24")
  })

  it("says the rule is open to any address when it has no remote", () => {
    renderDialog({})

    expect(screen.getByText(/Remote/).textContent).toBe("Remote: Any")
  })
})
