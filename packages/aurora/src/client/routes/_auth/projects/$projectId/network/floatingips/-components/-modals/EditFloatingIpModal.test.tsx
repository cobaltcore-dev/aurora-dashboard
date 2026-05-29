import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { EditFloatingIpModal, EditFloatingIpModalProps } from "./EditFloatingIpModal"

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

type EditFloatingIpModalRenderOptions = Partial<EditFloatingIpModalProps>

const renderModalComponent = ({
  floatingIp = mockFloatingIp,
  open = true,
  onClose = vi.fn(),
  onUpdate = vi.fn(),
  isLoading = false,
  error = null,
}: EditFloatingIpModalRenderOptions = {}) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>
      <EditFloatingIpModal
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
}: EditFloatingIpModalRenderOptions = {}) =>
  render(renderModalComponent({ floatingIp, open, onClose, onUpdate, isLoading, error }))

const submitModalForm = () => {
  fireEvent.submit(document.getElementById("edit-floating-ip-form") as HTMLFormElement)
}

describe("EditFloatingIpModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  describe("Rendering", () => {
    test("renders title with floating IP address", () => {
      renderModal()

      expect(screen.getByText("Edit Floating IP 203.0.113.10")).toBeInTheDocument()
    })

    test("pre-fills description from floating IP", () => {
      renderModal()

      const descriptionInput = screen.getByLabelText("Description") as HTMLTextAreaElement
      expect(descriptionInput.value).toBe("Existing description")
    })

    test("pre-fills empty description when floating IP description is null", () => {
      renderModal({ floatingIp: { ...mockFloatingIp, description: null } })

      const descriptionInput = screen.getByLabelText("Description") as HTMLTextAreaElement
      expect(descriptionInput.value).toBe("")
    })

    test("does not render when open is false", () => {
      renderModal({ open: false })

      expect(screen.queryByText("Edit Floating IP 203.0.113.10")).not.toBeInTheDocument()
    })
  })

  describe("Submit behavior", () => {
    test("keeps save button disabled while form is pristine", () => {
      renderModal()

      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    })

    test("calls onUpdate with trimmed description and port_id", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onUpdate })

      const descriptionInput = screen.getByLabelText("Description")
      await user.clear(descriptionInput)
      await user.type(descriptionInput, "  Updated description  ")

      submitModalForm()

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("fip-123", {
          project_id: "test-project",
          port_id: "port-1",
          description: "Updated description",
        })
      })
    })

    test("passes null port_id when floating IP has no port", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({
        floatingIp: { ...mockFloatingIp, port_id: null, description: "old" },
        onUpdate,
      })

      const descriptionInput = screen.getByLabelText("Description")
      await user.clear(descriptionInput)
      await user.type(descriptionInput, "new description")

      submitModalForm()

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith("fip-123", {
          project_id: "test-project",
          port_id: null,
          description: "new description",
        })
      })
    })
  })

  describe("Validation", () => {
    test("shows validation error and does not submit when description is empty", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ onUpdate })

      const descriptionInput = screen.getByLabelText("Description")
      await user.clear(descriptionInput)
      await user.type(descriptionInput, "temp")
      await user.clear(descriptionInput)
      submitModalForm()

      await waitFor(() => {
        expect(onUpdate).not.toHaveBeenCalled()
      })
      expect(screen.getByText("Edit Floating IP 203.0.113.10")).toBeInTheDocument()
    })
  })

  describe("Loading and error states", () => {
    test("shows loading state and hides form when isLoading is true", () => {
      renderModal({ isLoading: true })

      expect(screen.getByText("Updating Floating IP...")).toBeInTheDocument()
      expect(screen.queryByLabelText("Description")).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    })

    test("displays error message when error prop is provided", () => {
      renderModal({ error: "Failed to update floating IP" })

      expect(screen.getByText("Failed to update floating IP")).toBeInTheDocument()
    })

    test("does not display error message when error is null", () => {
      renderModal({ error: null })

      expect(screen.queryByText("Failed to update floating IP")).not.toBeInTheDocument()
    })

    test("does not submit while loading", async () => {
      const onUpdate = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderModal({ isLoading: true, onUpdate })

      await user.click(screen.getByRole("button", { name: "Save" }))

      expect(onUpdate).not.toHaveBeenCalled()
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

    test("resets description to initial value when cancel is clicked", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const { rerender } = renderModal({ onClose })

      const descriptionInput = screen.getByLabelText("Description") as HTMLTextAreaElement
      await user.clear(descriptionInput)
      await user.type(descriptionInput, "temporary value")
      expect(descriptionInput.value).toBe("temporary value")

      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(onClose).toHaveBeenCalledTimes(1)

      rerender(
        renderModalComponent({
          floatingIp: mockFloatingIp,
          open: false,
          onClose,
          onUpdate: vi.fn(),
          isLoading: false,
          error: null,
        })
      )

      rerender(
        renderModalComponent({
          floatingIp: mockFloatingIp,
          open: true,
          onClose,
          onUpdate: vi.fn(),
          isLoading: false,
          error: null,
        })
      )

      await waitFor(() => {
        expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe("Existing description")
      })
    })
  })
})
