import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ConfigureVersioningModal } from "./ConfigureVersioningModal"
import type { ContainerSummary, ContainerInfo } from "@/server/Storage/types/swift"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidateContainerMetadata = vi.fn()
const mockInvalidateListContainers = vi.fn()

let metadataLoading = false
let metadataError: { message: string } | null = null
let mockContainerInfo: ContainerInfo | undefined = undefined
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
          listContainers: { invalidate: mockInvalidateListContainers },
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
        listContainers: {
          useQuery: () => ({
            data: [{ name: "versions-container" }, { name: "other-container" }],
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
  versionsEnabled: false,
  versionsLocation: "",
  historyLocation: "",
  ...overrides,
})

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
        <ConfigureVersioningModal
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

describe("ConfigureVersioningModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    metadataLoading = false
    metadataError = null
    mockContainerInfo = makeContainerInfo()
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
      expect(screen.queryByText(/Configure Versioning/i)).not.toBeInTheDocument()
    })

    test("does not render when container is null", () => {
      renderModal({ container: null })
      expect(screen.queryByText(/Configure Versioning/i)).not.toBeInTheDocument()
    })

    test("renders modal title when open", () => {
      renderModal()
      expect(screen.getByText("Configure Versioning")).toBeInTheDocument()
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
  // Versioning states (Case 1 / 2 / 3)
  // ──────────────────────────────────────────────────────────────────────────

  describe("Versioning checkbox states", () => {
    test("Case 2: shows unchecked checkbox when versioning is not enabled", () => {
      mockContainerInfo = makeContainerInfo({ versionsEnabled: false, versionsLocation: "" })
      renderModal()
      expect(screen.getByLabelText(/Store old object versions/i)).not.toBeChecked()
    })

    test("Case 1: shows readonly 'Versioning is enabled' when server flag is on with no container", () => {
      mockContainerInfo = makeContainerInfo({ versionsEnabled: true, versionsLocation: "", historyLocation: "" })
      renderModal()
      expect(screen.getByLabelText(/Versioning is enabled/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Versioning is enabled/i)).toBeDisabled()
    })

    test("Case 3: shows checked checkbox with combobox when versionsLocation is set", () => {
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      expect(screen.getByLabelText(/Store old object versions in container/i)).toBeChecked()
    })

    test("Save is disabled when versioning is unchanged", () => {
      mockContainerInfo = makeContainerInfo({ versionsEnabled: false })
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })

    test("Save is disabled when checkbox is checked but no container is selected", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsEnabled: false })
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions/i))
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Uncheck / re-check flow
  // ──────────────────────────────────────────────────────────────────────────

  describe("Uncheck and re-check flow", () => {
    test("unchecking in Case 3 shows the unchecked checkbox (Case 2), not the readonly one", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      expect(screen.getByLabelText(/Store old object versions/i)).not.toBeChecked()
      expect(screen.queryByLabelText(/Versioning is enabled/i)).not.toBeInTheDocument()
    })

    test("re-checking after uncheck goes back to Case 3 (editable), not the readonly Case 1", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      // Uncheck
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      // Re-check
      await user.click(screen.getByLabelText(/Store old object versions/i))
      expect(screen.getByLabelText(/Store old object versions in container/i)).toBeChecked()
      expect(screen.queryByLabelText(/Versioning is enabled/i)).not.toBeInTheDocument()
    })

    test("Save is enabled after unchecking a container that had versioning", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      expect(screen.getByRole("button", { name: /Save/i })).toBeEnabled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Submission
  // ──────────────────────────────────────────────────────────────────────────

  describe("Submission", () => {
    test("sends removeVersionsLocation when disabling versioning on a versioned container", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: mockProjectId,
          container: "my-container",
          removeVersionsLocation: true,
          versionsLocation: undefined,
        })
      )
    })

    test("calls onSuccess with container name after successful mutation", async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal({ onSuccess })
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("my-container")
      })
    })

    test("invalidates getContainerMetadata cache on success", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(mockInvalidateContainerMetadata).toHaveBeenCalledWith({ container: "my-container" })
      })
    })

    test("invalidates listContainers cache on success", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(mockInvalidateListContainers).toHaveBeenCalled()
      })
    })

    test("closes modal after successful mutation", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal({ onClose })
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
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
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal({ onError })
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("my-container", "Internal Server Error")
      })
    })

    test("closes modal on mutation failure", async () => {
      mutationError = "Server error"
      const onClose = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal({ onClose })
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
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
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
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
      mockContainerInfo = makeContainerInfo({ versionsEnabled: false })
      const { rerender } = render(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ConfigureVersioningModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await user.click(screen.getByLabelText(/Store old object versions/i))
      expect(screen.getByLabelText(/Store old object versions in container/i)).toBeChecked()

      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ConfigureVersioningModal isOpen={false} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ConfigureVersioningModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await waitFor(() => {
        expect(screen.getByLabelText(/Store old object versions/i)).not.toBeChecked()
      })
    })
  })
})
