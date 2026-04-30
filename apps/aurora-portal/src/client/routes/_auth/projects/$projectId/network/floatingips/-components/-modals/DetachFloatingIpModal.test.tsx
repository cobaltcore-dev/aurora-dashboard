import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { DetachFloatingIpModal, DetachFloatingIpModalProps } from "./DetachFloatingIpModal"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    useParams: vi.fn(() => ({ projectId: "test-project" })),
  }
})

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

type DetachFloatingIpModalRenderOptions = Partial<DetachFloatingIpModalProps>

const renderModalComponent = ({
  floatingIp = mockFloatingIp,
  open = true,
  onClose = vi.fn(),
  onUpdate = vi.fn(),
  isLoading = false,
  error = null,
}: DetachFloatingIpModalRenderOptions = {}) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>
      <DetachFloatingIpModal
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
  onUpdate = vi.fn(),
  isLoading = false,
  error = null,
}: DetachFloatingIpModalRenderOptions = {}) =>
  render(renderModalComponent({ floatingIp, open, onClose, onUpdate, isLoading, error }))

describe("DetachFloatingIpModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  describe("Rendering", () => {
    test("renders title with floating IP address", () => {
      renderModal()

      expect(screen.getByText("Detach Floating IP 203.0.113.10")).toBeInTheDocument()
    })

    test("shows confirmation instructions", () => {
      renderModal()

      expect(screen.getByText(/Detaching this Floating IP will remove its association/i)).toBeInTheDocument()
      expect(screen.getByText(/type the word/i)).toBeInTheDocument()
    })

    test("does not render when open is false", () => {
      renderModal({ open: false })

      expect(screen.queryByText("Detach Floating IP 203.0.113.10")).not.toBeInTheDocument()
    })
  })

  describe("Validation and submit behavior", () => {
    test("keeps detach button disabled until exact confirmation text is entered", async () => {
      const user = userEvent.setup()
      renderModal()

      const detachButton = screen.getByRole("button", { name: "Detach" })
      const input = screen.getByPlaceholderText('Type "detach" to confirm')

      expect(detachButton).toBeDisabled()

      await user.type(input, "Detach")
      expect(detachButton).toBeDisabled()

      await user.clear(input)
      await user.type(input, "detach")
      expect(detachButton).toBeEnabled()
    })

    test("calls onUpdate with floating IP id and null port_id when confirmed", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onUpdate })

      const input = screen.getByPlaceholderText('Type "detach" to confirm')
      await user.type(input, "detach")
      const detachButton = screen.getByRole("button", { name: "Detach" })

      await waitFor(() => {
        expect(detachButton).toBeEnabled()
      })

      await user.click(detachButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("fip-123", { project_id: "test-project", port_id: null })
      })
    })

    test("calls onClose after successful detach", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onUpdate, onClose })

      const input = screen.getByPlaceholderText('Type "detach" to confirm')
      await user.type(input, "detach")
      const detachButton = screen.getByRole("button", { name: "Detach" })

      await waitFor(() => {
        expect(detachButton).toBeEnabled()
      })

      await user.click(detachButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("Loading and error states", () => {
    test("shows loading state and hides input form when isLoading is true", () => {
      renderModal({ isLoading: true })

      expect(screen.getByText("Detaching Floating IP...")).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Type "detach" to confirm')).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Detach" })).toBeDisabled()
    })

    test("displays error message when error prop is provided", () => {
      renderModal({ error: "Failed to detach floating IP" })

      expect(screen.getByText("Failed to detach floating IP")).toBeInTheDocument()
    })

    test("does not display error message when error is null", () => {
      renderModal({ error: null })

      expect(screen.queryByText("Failed to detach floating IP")).not.toBeInTheDocument()
    })
  })

  describe("Cancel behavior", () => {
    test("calls onClose when cancel is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })

      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    test("resets confirmation input when cancel is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const { rerender } = renderModal({ onClose, onUpdate })

      const input = screen.getByPlaceholderText('Type "detach" to confirm') as HTMLInputElement
      await user.type(input, "detach")
      expect(input.value).toBe("detach")

      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(onClose).toHaveBeenCalledTimes(1)

      rerender(
        renderModalComponent({
          floatingIp: mockFloatingIp,
          open: false,
          onClose,
          onUpdate,
          isLoading: false,
          error: null,
        })
      )

      rerender(
        renderModalComponent({
          floatingIp: mockFloatingIp,
          open: true,
          onClose,
          onUpdate,
          isLoading: false,
          error: null,
        })
      )

      await waitFor(() => {
        expect((screen.getByPlaceholderText('Type "detach" to confirm') as HTMLInputElement).value).toBe("")
      })
    })
  })
})
