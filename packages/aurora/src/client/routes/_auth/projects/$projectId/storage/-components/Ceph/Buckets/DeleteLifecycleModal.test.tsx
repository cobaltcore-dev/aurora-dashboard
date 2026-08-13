import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteLifecycleModal } from "./DeleteLifecycleModal"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── useRouteContext mock ─────────────────────────────────────────────────────

const mockOnTrackEvent = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useRouteContext: () => ({
    onTrackEvent: mockOnTrackEvent,
  }),
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

type MutationOptions = {
  onSuccess?: () => void
  onError?: (error: { message: string }) => void
}

const { mockInvalidate, mockDeleteMutate, mockReset, mockState } = vi.hoisted(() => {
  const mockState = {
    queryData: null as { rules: LifecycleRuleRead[] | null } | null,
    isLoading: false,
    queryError: null as { message: string } | null,
    deleteError: null as string | null,
    isPending: false,
    capturedOptions: {} as MutationOptions,
  }
  const mockDeleteMutate = vi.fn().mockImplementation((_variables: unknown, options?: MutationOptions) => {
    const mergedOptions = { ...mockState.capturedOptions, ...options }
    if (mockState.deleteError) {
      mergedOptions.onError?.({ message: mockState.deleteError })
    } else {
      mergedOptions.onSuccess?.()
    }
  })
  return {
    mockInvalidate: vi.fn(),
    mockDeleteMutate,
    mockReset: vi.fn(),
    mockState,
  }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          lifecycle: { get: { invalidate: mockInvalidate } },
        },
      },
    }),
    storage: {
      ceph: {
        lifecycle: {
          get: {
            useQuery: () => ({
              data: mockState.queryData,
              isLoading: mockState.isLoading,
              error: mockState.queryError,
            }),
          },
          delete: {
            useMutation: (options: MutationOptions) => {
              mockState.capturedOptions = options ?? {}
              return { mutate: mockDeleteMutate, isPending: mockState.isPending, reset: mockReset }
            },
          },
        },
      },
    },
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  bucketName = "test-bucket",
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  bucketName?: string
  onClose?: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DeleteLifecycleModal
          isOpen={isOpen}
          bucketName={bucketName}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteLifecycleModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.queryData = null
    mockState.isLoading = false
    mockState.queryError = null
    mockState.deleteError = null
    mockState.isPending = false
    mockState.capturedOptions = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Delete Lifecycle Configuration/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true", () => {
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal()
      expect(screen.getByRole("heading", { name: /Delete Lifecycle Configuration/i })).toBeInTheDocument()
    })
  })

  describe("Loading state", () => {
    test("shows spinner while loading", () => {
      mockState.isLoading = true
      renderModal()
      expect(screen.getByRole("progressbar")).toBeInTheDocument()
    })

    test("disables Delete button while loading", () => {
      mockState.isLoading = true
      renderModal()
      expect(screen.getByRole("button", { name: /Delete Lifecycle/i })).toBeDisabled()
    })
  })

  describe("Empty lifecycle state", () => {
    test("shows warning when no lifecycle rules exist", () => {
      mockState.queryData = { rules: null }
      renderModal()
      expect(screen.getByText(/No lifecycle configuration found/i)).toBeInTheDocument()
    })

    test("disables Delete button when no lifecycle rules exist", () => {
      mockState.queryData = { rules: null }
      renderModal()
      expect(screen.getByRole("button", { name: /Delete Lifecycle/i })).toBeDisabled()
    })

    test("shows warning when lifecycle rules array is empty", () => {
      mockState.queryData = { rules: [] }
      renderModal()
      expect(screen.getByText(/No lifecycle configuration found/i)).toBeInTheDocument()
    })
  })

  describe("Lifecycle configuration with rules", () => {
    test("shows confirmation message with bucket name", () => {
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal({ bucketName: "my-bucket" })
      expect(screen.getByText(/my-bucket/i)).toBeInTheDocument()
    })

    test("shows warning about consequences", () => {
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal()
      expect(screen.getByText(/Objects will no longer be automatically expired/i)).toBeInTheDocument()
    })

    test("shows rule count (singular)", () => {
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal()
      expect(screen.getByText(/1 lifecycle rule/i)).toBeInTheDocument()
    })

    test("shows rule count (plural)", () => {
      mockState.queryData = {
        rules: [
          { ID: "rule1", Status: "Enabled" },
          { ID: "rule2", Status: "Disabled" },
        ],
      }
      renderModal()
      expect(screen.getByText(/2 lifecycle rules/i)).toBeInTheDocument()
    })

    test("enables Delete button when rules exist", () => {
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal()
      expect(screen.getByRole("button", { name: /Delete Lifecycle/i })).not.toBeDisabled()
    })
  })

  describe("Query error handling", () => {
    test("shows error message when query fails", () => {
      mockState.queryError = { message: "Failed to fetch lifecycle configuration" }
      renderModal()
      expect(screen.getByText(/Failed to load lifecycle configuration/i)).toBeInTheDocument()
      expect(screen.getByText(/Failed to fetch lifecycle configuration/i)).toBeInTheDocument()
    })

    test("disables Delete button when query fails", () => {
      mockState.queryError = { message: "Query error" }
      renderModal()
      expect(screen.getByRole("button", { name: /Delete Lifecycle/i })).toBeDisabled()
    })
  })

  describe("Delete operation", () => {
    test("calls delete mutation with correct parameters", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal({ bucketName: "my-bucket" })

      const deleteButton = screen.getByRole("button", { name: /Delete Lifecycle/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockDeleteMutate).toHaveBeenCalledWith({
          project_id: mockProjectId,
          bucketName: "my-bucket",
        })
      })
    })

    test("disables buttons while deleting", () => {
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      mockState.isPending = true
      renderModal()

      expect(screen.getByRole("button", { name: /Delete Lifecycle/i })).toBeDisabled()
    })
  })

  describe("Success handling", () => {
    test("calls onSuccess with bucket name", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSuccess = vi.fn()
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal({ bucketName: "my-bucket", onSuccess: mockOnSuccess })

      const deleteButton = screen.getByRole("button", { name: /Delete Lifecycle/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith("my-bucket")
      })
    })

    test("invalidates lifecycle query on success", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal()

      const deleteButton = screen.getByRole("button", { name: /Delete Lifecycle/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled()
      })
    })

    test("closes modal on success", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal({ onClose: mockOnClose })

      const deleteButton = screen.getByRole("button", { name: /Delete Lifecycle/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe("Error handling", () => {
    test("calls onError with bucket name and error message", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnError = vi.fn()
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      mockState.deleteError = "Failed to delete lifecycle"
      renderModal({ bucketName: "my-bucket", onError: mockOnError })

      const deleteButton = screen.getByRole("button", { name: /Delete Lifecycle/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith("my-bucket", "Failed to delete lifecycle")
      })
    })
  })

  describe("Cancel behavior", () => {
    test("closes modal when Cancel button is clicked", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal({ onClose: mockOnClose })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    test("resets mutation state when modal closes", () => {
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      const { rerender } = renderModal({ isOpen: true })

      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <DeleteLifecycleModal isOpen={false} bucketName="test-bucket" onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )

      expect(mockReset).toHaveBeenCalled()
    })
  })

  describe("Analytics tracking", () => {
    test("tracks .open event when modal opens", async () => {
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal()

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "modal",
          action: "storage.ceph.bucket.lifecycle.delete.open",
        })
      })
    })

    test("tracks .close event when user cancels", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.queryData = { rules: [{ ID: "rule1", Status: "Enabled" }] }
      renderModal()

      // Wait for .open event
      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
      })

      mockOnTrackEvent.mockClear()

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.bucket.lifecycle.delete.close",
      })
    })
  })
})
