import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { LifecycleModal } from "./LifecycleModal"
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

const { mockInvalidate, mockSetMutate, mockDeleteMutate, mockReset, mockState } = vi.hoisted(() => {
  const mockState = {
    queryData: null as { rules: LifecycleRuleRead[] | null } | null,
    isLoading: false,
    setError: null as string | null,
    deleteError: null as string | null,
    capturedSetOptions: {} as MutationOptions,
    capturedDeleteOptions: {} as MutationOptions,
  }
  const mockSetMutate = vi.fn().mockImplementation((_variables: unknown, options?: MutationOptions) => {
    const mergedOptions = { ...mockState.capturedSetOptions, ...options }
    if (mockState.setError) {
      mergedOptions.onError?.({ message: mockState.setError })
    } else {
      mergedOptions.onSuccess?.()
    }
  })
  const mockDeleteMutate = vi.fn().mockImplementation((_variables: unknown, options?: MutationOptions) => {
    const mergedOptions = { ...mockState.capturedDeleteOptions, ...options }
    if (mockState.deleteError) {
      mergedOptions.onError?.({ message: mockState.deleteError })
    } else {
      mergedOptions.onSuccess?.()
    }
  })
  return {
    mockInvalidate: vi.fn(),
    mockSetMutate,
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
              error: null,
            }),
          },
          set: {
            useMutation: (options: MutationOptions) => {
              mockState.capturedSetOptions = options ?? {}
              return { mutate: mockSetMutate, reset: mockReset }
            },
          },
          delete: {
            useMutation: (options: MutationOptions) => {
              mockState.capturedDeleteOptions = options ?? {}
              return { mutate: mockDeleteMutate, reset: mockReset }
            },
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockRuleWithTransitions = {
  ID: "archive-rule",
  Status: "Enabled",
  Filter: { Prefix: "logs/" },
  Expiration: { Days: 90 },
  Transitions: [{ Days: 30, StorageClass: "GLACIER" }],
}

const mockRuleWithLegacyPrefix = {
  ID: "legacy-rule",
  Status: "Enabled",
  Prefix: "legacy/",
  Expiration: { Days: 30 },
}

const mockRuleWithDateExpiration = {
  ID: "date-rule",
  Status: "Enabled",
  Filter: { Prefix: "temp/" },
  Expiration: { Date: "2026-12-31T00:00:00.000Z" },
}

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
  onSuccess?: (bucketName: string, operation: "save" | "delete") => void
  onError?: (bucketName: string, errorMessage: string, operation: "save" | "delete") => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <LifecycleModal
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

describe("LifecycleModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.queryData = null
    mockState.isLoading = false
    mockState.setError = null
    mockState.deleteError = null
    mockState.capturedSetOptions = {}
    mockState.capturedDeleteOptions = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Lifecycle Rules/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true", () => {
      mockState.queryData = { rules: null }
      renderModal()
      expect(screen.getByRole("heading", { name: /Lifecycle Rules/i })).toBeInTheDocument()
    })
  })

  describe("Loading state", () => {
    test("shows spinner while loading", () => {
      mockState.isLoading = true
      renderModal()
      expect(screen.getByRole("progressbar")).toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    test("shows Add New Rule form when no rules exist", async () => {
      mockState.queryData = { rules: null }
      renderModal()
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Add New Rule/i })).toBeInTheDocument()
      })
    })

    test("shows Add New Rule button in empty state", async () => {
      mockState.queryData = { rules: null }
      renderModal()
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Add New Rule/i })).toBeInTheDocument()
      })
    })
  })

  describe("Rule display", () => {
    test("shows rules in list view when rules exist", async () => {
      mockState.queryData = { rules: [mockRuleWithTransitions] }
      renderModal()

      await waitFor(() => {
        expect(screen.getByText(/archive-rule/i)).toBeInTheDocument()
      })

      // Should show the rule's details
      expect(screen.getByText(/archive-rule/i)).toBeInTheDocument()
    })

    test("shows edit and delete buttons for rules", async () => {
      mockState.queryData = { rules: [mockRuleWithTransitions] }
      renderModal()

      await waitFor(() => {
        const editButtons = screen.getAllByTitle("Edit")
        // Should have at least one edit button
        expect(editButtons.length).toBeGreaterThan(0)
      })
    })
  })

  describe("Regression tests for items 23/24 (tested in LifecycleRuleForm)", () => {
    test("LifecycleRuleForm handles legacy Prefix correctly", () => {
      // This is covered by LifecycleRuleForm.test.tsx
      // Just verify the modal can display legacy rules
      mockState.queryData = { rules: [mockRuleWithLegacyPrefix] }
      renderModal()
      expect(screen.getByText(/legacy-rule/i)).toBeInTheDocument()
    })

    test("LifecycleRuleForm handles Date expiration correctly", () => {
      // This is covered by LifecycleRuleForm.test.tsx
      // Just verify the modal can display Date expiration rules
      mockState.queryData = { rules: [mockRuleWithDateExpiration] }
      renderModal()
      expect(screen.getByText(/date-rule/i)).toBeInTheDocument()
    })
  })

  describe("Cancel behavior", () => {
    test("closes modal when Cancel is clicked", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      mockState.queryData = { rules: null }
      renderModal({ onClose: mockOnClose })

      const cancelButton = screen.getByRole("button", { name: /Close/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe("Analytics tracking", () => {
    test("tracks .open event when modal opens", async () => {
      mockState.queryData = { rules: null }
      renderModal()

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "modal",
          action: "storage.ceph.bucket.lifecycle.open",
        })
      })
    })
  })
})
