import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { AssociateFloatingIpModal, AssociateFloatingIpModalProps } from "./AssociateFloatingIpModal"

const mockFloatingIp: FloatingIp = {
  id: "fip-123",
  floating_ip_address: "203.0.113.10",
  fixed_ip_address: "10.0.0.5",
  floating_network_id: "net-external",
  port_id: "port-1",
  router_id: "router-1",
  project_id: "proj-1",
  tenant_id: "proj-1",
  status: "ACTIVE",
  dns_domain: "example.com",
  dns_name: "fip-1",
  description: "Existing description",
  revision_number: 1,
  tags: [],
}

type AssociateFloatingIpModalRenderOptions = Partial<AssociateFloatingIpModalProps>

const renderModalComponent = ({
  floatingIp = mockFloatingIp,
  open = true,
  onClose = vi.fn(),
  onUpdate = vi.fn(),
  isLoading = false,
  error = null,
}: AssociateFloatingIpModalRenderOptions = {}) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>
      <AssociateFloatingIpModal
        floatingIp={floatingIp}
        open={open}
        onClose={onClose}
        onUpdate={onUpdate}
        isLoading={isLoading}
        error={error}
      />
    </PortalProvider>
  </I18nProvider>
)

const renderModal = ({
  floatingIp = mockFloatingIp,
  open = true,
  onClose = vi.fn(),
  onUpdate = vi.fn().mockResolvedValue(undefined),
  isLoading = false,
  error = null,
}: AssociateFloatingIpModalRenderOptions = {}) =>
  render(renderModalComponent({ floatingIp, open, onClose, onUpdate, isLoading, error }))

describe("AssociateFloatingIpModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  test("renders title and fixed IP input", () => {
    renderModal()

    expect(screen.getByText("Associate Floating IP 203.0.113.10 with Port")).toBeInTheDocument()
    expect(screen.getByLabelText("Fixed IP Address")).toBeInTheDocument()
  })

  test("does not render when open is false", () => {
    renderModal({ open: false })

    expect(screen.queryByText("Associate Floating IP 203.0.113.10 with Port")).not.toBeInTheDocument()
  })

  test("submits with valid IPv4", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal({ onUpdate, onClose })

    const input = screen.getByLabelText("Fixed IP Address")
    await user.type(input, "192.168.1.10")
    await user.click(screen.getByRole("button", { name: "Associate" }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("fip-123", {
        port_id: "port-1",
        fixed_ip_address: "192.168.1.10",
      })
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test("submits with valid IPv6", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderModal({ onUpdate })

    const input = screen.getByLabelText("Fixed IP Address")
    await user.type(input, "2001:0db8:85a3:0000:0000:8a2e:0370:7334")
    await user.click(screen.getByRole("button", { name: "Associate" }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("fip-123", {
        port_id: "port-1",
        fixed_ip_address: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      })
    })
  })

  test("does not submit with invalid IP and shows validation error", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderModal({ onUpdate })

    const input = screen.getByLabelText("Fixed IP Address")
    await user.type(input, "999.999.999.999")
    await user.click(screen.getByRole("button", { name: "Associate" }))

    await waitFor(() => {
      expect(onUpdate).not.toHaveBeenCalled()
    })
    expect(screen.getByText("Enter a valid IPv4 or IPv6 address.")).toBeInTheDocument()
  })

  test("shows loading state and disables associate action", () => {
    renderModal({ isLoading: true })

    expect(screen.getByText("Associating Floating IP...")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Associate" })).toBeDisabled()
    expect(screen.queryByLabelText("Fixed IP Address")).not.toBeInTheDocument()
  })

  test("renders API error message when provided", () => {
    renderModal({ error: "Association failed" })

    expect(screen.getByText("Association failed")).toBeInTheDocument()
  })

  test("calls onClose when cancel is clicked", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal({ onClose })

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
