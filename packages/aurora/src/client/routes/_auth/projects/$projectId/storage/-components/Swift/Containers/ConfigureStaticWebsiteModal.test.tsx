import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ConfigureStaticWebsiteModal } from "./ConfigureStaticWebsiteModal"
import type { ContainerSummary, ContainerInfo } from "@/server/Storage/types/swift"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidateContainerMetadata = vi.fn()

let metadataLoading = false
let metadataError: { message: string } | null = null
let mockContainerInfo: ContainerInfo | undefined = undefined
let mockPublicUrl: string | undefined = undefined
let mutationError: string | null = null
let mutationIsPending = false

let capturedMutationOptions: {
  onSuccess?: () => void
  onError?: (error: { message: string }) => void
} = {}

const mockMutate = vi.fn().mockImplementation(() => {
  if (mutationError) {
    capturedMutationOptions.onError?.({ message: mutationError })
  } else {
    capturedMutationOptions.onSuccess?.()
  }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          getContainerMetadata: { invalidate: mockInvalidateContainerMetadata },
        },
      },
    }),
    storage: {
      swift: {
        getContainerMetadata: {
          useQuery: () => ({
            data: mockContainerInfo,
            isLoading: metadataLoading,
            isError: metadataError !== null,
            error: metadataError,
          }),
        },
        getContainerPublicUrl: {
          useQuery: () => ({
            data: mockPublicUrl,
          }),
        },
        updateContainerMetadata: {
          useMutation: (options: typeof capturedMutationOptions) => {
            capturedMutationOptions = options ?? {}
            return {
              mutate: mockMutate,
              reset: mockReset,
              isPending: mutationIsPending,
            }
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeContainer = (overrides: Partial<ContainerSummary> = {}): ContainerSummary => ({
  name: "my-container",
  count: 5,
  bytes: 1024,
  last_modified: "2024-01-15T10:30:00.000000",
  ...overrides,
})

const makeContainerInfo = (overrides: Partial<ContainerInfo> = {}): ContainerInfo => ({
  objectCount: 0,
  bytesUsed: 0,
  hasTempUrlKey: false,
  hasSyncKey: false,
  ...overrides,
})

const makePublicContainerInfo = (overrides: Partial<ContainerInfo> = {}): ContainerInfo =>
  makeContainerInfo({ read: ".r:*,.rlistings", ...overrides })

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  container = makeContainer(),
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  container?: ContainerSummary | null
  onClose?: () => void
  onSuccess?: (name: string) => void
  onError?: (name: string, error: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ConfigureStaticWebsiteModal
          isOpen={isOpen}
          container={container}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ConfigureStaticWebsiteModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    metadataLoading = false
    metadataError = null
    mockContainerInfo = makeContainerInfo()
    mockPublicUrl = undefined
    mutationError = null
    mutationIsPending = false
    capturedMutationOptions = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Visibility
  // ──────────────────────────────────────────────────────────────────────────

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Configure Static Website/i)).not.toBeInTheDocument()
    })

    test("does not render when container is null", () => {
      renderModal({ container: null })
      expect(screen.queryByText(/Configure Static Website/i)).not.toBeInTheDocument()
    })

    test("renders modal title when open", () => {
      renderModal()
      expect(screen.getByText("Configure Static Website")).toBeInTheDocument()
    })

    test("renders container name in description", () => {
      renderModal({ container: makeContainer({ name: "my-container" }) })
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Loading state
  // ──────────────────────────────────────────────────────────────────────────

  describe("Loading state", () => {
    test("shows loading indicator while fetching metadata", () => {
      metadataLoading = true
      renderModal()
      expect(screen.getByText(/Loading Container Properties/i)).toBeInTheDocument()
    })

    test("Save button is disabled while loading", () => {
      metadataLoading = true
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Error state
  // ──────────────────────────────────────────────────────────────────────────

  describe("Error state", () => {
    test("shows error message when metadata query fails", () => {
      metadataError = { message: "Network error" }
      renderModal()
      expect(screen.getByText(/Failed to Load Container Properties/i)).toBeInTheDocument()
    })

    test("Save button is disabled when metadata query fails", () => {
      metadataError = { message: "Network error" }
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // No public access
  // ──────────────────────────────────────────────────────────────────────────

  describe("No public access", () => {
    test("shows Manage Access guidance when public read is not enabled", () => {
      mockContainerInfo = makeContainerInfo({ read: "" })
      renderModal()
      expect(screen.getByText(/Manage Access/i)).toBeInTheDocument()
      expect(screen.getByText(/Public read access is not enabled/i)).toBeInTheDocument()
    })

    test("Save button is disabled when public access is not enabled", () => {
      mockContainerInfo = makeContainerInfo({ read: "" })
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })

    test("does not render web-index or web-listings checkboxes when access is not public", () => {
      mockContainerInfo = makeContainerInfo({ read: "" })
      renderModal()
      expect(screen.queryByLabelText(/Serve objects as index/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Enable file listing/i)).not.toBeInTheDocument()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Public access — form state
  // ──────────────────────────────────────────────────────────────────────────

  describe("Public access — form state", () => {
    test("renders web-index and web-listings checkboxes when public access is enabled", () => {
      mockContainerInfo = makePublicContainerInfo()
      renderModal()
      expect(screen.getByLabelText(/Serve objects as index/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Enable file listing/i)).toBeInTheDocument()
    })

    test("web-index checkbox is unchecked when not set server-side", () => {
      mockContainerInfo = makePublicContainerInfo()
      renderModal()
      expect(screen.getByLabelText(/Serve objects as index/i)).not.toBeChecked()
    })

    test("web-index checkbox is checked and pre-filled when set server-side", () => {
      mockContainerInfo = makePublicContainerInfo({ metadata: { "web-index": "index.html" } })
      renderModal()
      expect(screen.getByLabelText(/Serve objects as index/i)).toBeChecked()
    })

    test("web-listings checkbox is unchecked when not set server-side", () => {
      mockContainerInfo = makePublicContainerInfo()
      renderModal()
      expect(screen.getByLabelText(/Enable file listing/i)).not.toBeChecked()
    })

    test("web-listings checkbox is checked when set server-side", () => {
      mockContainerInfo = makePublicContainerInfo({ metadata: { "web-listings": "1" } })
      renderModal()
      expect(screen.getByLabelText(/Enable file listing/i)).toBeChecked()
    })

    test("checking web-index pre-fills 'index.html' in the input", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      renderModal()
      await user.click(screen.getByLabelText(/Serve objects as index/i))
      expect(screen.getByDisplayValue("index.html")).toBeInTheDocument()
    })

    test("unchecking web-index clears the input value", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo({ metadata: { "web-index": "index.html" } })
      renderModal()
      await user.click(screen.getByLabelText(/Serve objects as index/i))
      expect(screen.queryByDisplayValue("index.html")).not.toBeInTheDocument()
    })

    test("Save is disabled when nothing has changed", () => {
      mockContainerInfo = makePublicContainerInfo()
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })

    test("Save is enabled after checking web-listings", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      renderModal()
      await user.click(screen.getByLabelText(/Enable file listing/i))
      expect(screen.getByRole("button", { name: /Save/i })).toBeEnabled()
    })

    test("Save is enabled after unchecking web-index on a container that had it set", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo({ metadata: { "web-index": "index.html" } })
      renderModal()
      await user.click(screen.getByLabelText(/Serve objects as index/i))
      expect(screen.getByRole("button", { name: /Save/i })).toBeEnabled()
    })

    test("shows public URL when available", () => {
      mockContainerInfo = makePublicContainerInfo()
      mockPublicUrl = "https://example.com/my-container"
      renderModal()
      expect(screen.getByText(/Public Access URL/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue("https://example.com/my-container")).toBeInTheDocument()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Submission
  // ──────────────────────────────────────────────────────────────────────────

  describe("Submission", () => {
    test("sends metadata with web-index when enabling it", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      renderModal()
      await user.click(screen.getByLabelText(/Serve objects as index/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: mockProjectId,
          container: "my-container",
          metadata: { "web-index": "index.html" },
          removeMetadata: undefined,
        })
      )
    })

    test("sends removeMetadata with web-index when disabling it", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo({ metadata: { "web-index": "index.html" } })
      renderModal()
      await user.click(screen.getByLabelText(/Serve objects as index/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          container: "my-container",
          metadata: undefined,
          removeMetadata: ["web-index"],
        })
      )
    })

    test("sends metadata with web-listings when enabling file listing", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      renderModal()
      await user.click(screen.getByLabelText(/Enable file listing/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          container: "my-container",
          metadata: { "web-listings": "1" },
          removeMetadata: undefined,
        })
      )
    })

    test("sends removeMetadata with web-listings when disabling it", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo({ metadata: { "web-listings": "1" } })
      renderModal()
      await user.click(screen.getByLabelText(/Enable file listing/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          container: "my-container",
          metadata: undefined,
          removeMetadata: ["web-listings"],
        })
      )
    })

    test("calls onSuccess with container name after successful mutation", async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      renderModal({ onSuccess })
      await user.click(screen.getByLabelText(/Enable file listing/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("my-container")
      })
    })

    test("invalidates getContainerMetadata cache on success", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      renderModal()
      await user.click(screen.getByLabelText(/Enable file listing/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(mockInvalidateContainerMetadata).toHaveBeenCalledWith({ container: "my-container" })
      })
    })

    test("closes modal after successful mutation", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      renderModal({ onClose })
      await user.click(screen.getByLabelText(/Enable file listing/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Error handling
  // ──────────────────────────────────────────────────────────────────────────

  describe("Error handling", () => {
    test("calls onError with container name and error message on mutation failure", async () => {
      mutationError = "Internal Server Error"
      const onError = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      renderModal({ onError })
      await user.click(screen.getByLabelText(/Enable file listing/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("my-container", "Internal Server Error")
      })
    })

    test("closes modal on mutation failure", async () => {
      mutationError = "Server error"
      const onClose = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      renderModal({ onClose })
      await user.click(screen.getByLabelText(/Enable file listing/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Busy state
  // ──────────────────────────────────────────────────────────────────────────

  describe("Busy state", () => {
    test("Save button is disabled while mutation is pending", () => {
      mutationIsPending = true
      mockContainerInfo = makePublicContainerInfo({ metadata: { "web-listings": "1" } })
      renderModal()
      expect(screen.getByRole("button", { name: /Saving\.\.\./i })).toBeDisabled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Cancel / close
  // ──────────────────────────────────────────────────────────────────────────

  describe("Cancel / close", () => {
    test("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("resets form state when modal is closed and reopened", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makePublicContainerInfo()
      const { rerender } = render(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ConfigureStaticWebsiteModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await user.click(screen.getByLabelText(/Enable file listing/i))
      expect(screen.getByLabelText(/Enable file listing/i)).toBeChecked()

      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ConfigureStaticWebsiteModal isOpen={false} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ConfigureStaticWebsiteModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await waitFor(() => {
        expect(screen.getByLabelText(/Enable file listing/i)).not.toBeChecked()
      })
    })
  })
})
