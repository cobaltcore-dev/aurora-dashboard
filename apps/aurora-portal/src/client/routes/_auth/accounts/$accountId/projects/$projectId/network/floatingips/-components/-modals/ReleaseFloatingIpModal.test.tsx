import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ReleaseFloatingIpModal } from "./ReleaseFloatingIpModal"
import type { FloatingIp } from "@/server/Network/types/floatingIp"

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

const renderModal = ({
  floatingIp = mockFloatingIp,
  open = true,
  onClose = vi.fn(),
  onUpdate = vi.fn(),
  isLoading = false,
  error = null,
}: {
  floatingIp?: FloatingIp
  open?: boolean
  onClose?: () => void
  onUpdate?: (floatingIpId: string) => Promise<void>
  isLoading?: boolean
  error?: string | null
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ReleaseFloatingIpModal
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

describe("ReleaseFloatingIpModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  describe("Rendering", () => {
    test("renders title with floating IP address", () => {
      renderModal()

      expect(screen.getByText("Release Floating IP 203.0.113.10")).toBeInTheDocument()
    })

    test("shows confirmation instructions", () => {
      renderModal()

      expect(screen.getByText(/This action is permanent/i)).toBeInTheDocument()
      expect(screen.getByText(/type the word/i)).toBeInTheDocument()
    })

    test("does not render when open is false", () => {
      renderModal({ open: false })

      expect(screen.queryByText("Release Floating IP 203.0.113.10")).not.toBeInTheDocument()
    })
  })

  describe("Validation and submit behavior", () => {
    test("keeps release button disabled until exact confirmation text is entered", async () => {
      const user = userEvent.setup()
      renderModal()

      const releaseButton = screen.getByTestId("release-floating-ip-button")
      const input = screen.getByPlaceholderText('Type "release" to confirm')

      expect(releaseButton).toBeDisabled()

      await user.type(input, "Release")
      expect(releaseButton).toBeDisabled()

      await user.clear(input)
      await user.type(input, "release")
      expect(releaseButton).toBeEnabled()
    })

    test("calls onUpdate with floating IP id when confirmed", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onUpdate })

      const input = screen.getByPlaceholderText('Type "release" to confirm')
      await user.type(input, "release")
      const releaseButton = screen.getByTestId("release-floating-ip-button")

      await waitFor(() => {
        expect(releaseButton).toBeEnabled()
      })

      await user.click(releaseButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("fip-123")
      })
    })

    test("calls onClose after successful release", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onUpdate, onClose })

      const input = screen.getByPlaceholderText('Type "release" to confirm')
      await user.type(input, "release")
      const releaseButton = screen.getByTestId("release-floating-ip-button")

      await waitFor(() => {
        expect(releaseButton).toBeEnabled()
      })

      await user.click(releaseButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("Loading and error states", () => {
    test("shows loading state and hides input form when isLoading is true", () => {
      renderModal({ isLoading: true })

      expect(screen.getByText("Releasing Floating IP...")).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Type "release" to confirm')).not.toBeInTheDocument()
      expect(screen.getByTestId("release-floating-ip-button")).toBeDisabled()
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    })

    test("displays error message when error prop is provided", () => {
      renderModal({ error: "Failed to release floating IP" })

      expect(screen.getByText("Failed to release floating IP")).toBeInTheDocument()
    })

    test("does not display error message when error is null", () => {
      renderModal({ error: null })

      expect(screen.queryByText("Failed to release floating IP")).not.toBeInTheDocument()
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
      renderModal({ onClose })

      const input = screen.getByPlaceholderText('Type "release" to confirm') as HTMLInputElement
      await user.type(input, "release")
      expect(input.value).toBe("release")

      await user.click(screen.getByRole("button", { name: "Cancel" }))

      await waitFor(() => {
        expect((screen.getByPlaceholderText('Type "release" to confirm') as HTMLInputElement).value).toBe("")
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
