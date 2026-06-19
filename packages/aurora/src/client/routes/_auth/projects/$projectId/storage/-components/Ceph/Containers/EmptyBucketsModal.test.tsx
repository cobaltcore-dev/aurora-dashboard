import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { EmptyBucketsModal } from "./EmptyBucketsModal"
import type { Bucket } from "@/server/Storage/types/ceph"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const { mockInvalidate, mockMutateAsync, mockReset, mockState } = vi.hoisted(() => {
  const mockState = {
    isPending: false,
    shouldFail: false,
    failOnBucket: null as string | null,
  }
  const mockMutateAsync = vi.fn().mockImplementation(async (params: { containerName: string }) => {
    if (mockState.shouldFail || params.containerName === mockState.failOnBucket) {
      throw new Error(`Failed to empty bucket ${params.containerName}`)
    }
    // Return number of deleted objects
    return 5
  })
  return {
    mockInvalidate: vi.fn(),
    mockMutateAsync,
    mockReset: vi.fn(),
    mockState,
  }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          containers: { list: { invalidate: mockInvalidate } },
        },
      },
    }),
    storage: {
      ceph: {
        objects: {
          deleteAll: {
            useMutation: () => {
              return { mutateAsync: mockMutateAsync, isPending: mockState.isPending, reset: mockReset }
            },
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockBuckets: Bucket[] = [
  { name: "bucket-1", creationDate: "2024-01-15T10:00:00Z", count: 5, bytes: 1024 },
  { name: "bucket-2", creationDate: "2024-01-15T10:00:00Z", count: 3, bytes: 512 },
  { name: "bucket-3", creationDate: "2024-01-15T10:00:00Z", count: 0, bytes: 0 },
]

const mockSingleBucket: Bucket[] = [
  { name: "single-bucket", creationDate: "2024-01-15T10:00:00Z", count: 10, bytes: 2048 },
]

const mockManyBuckets: Bucket[] = Array.from({ length: 25 }, (_, i) => ({
  name: `bucket-${i + 1}`,
  creationDate: "2024-01-15T10:00:00Z",
  count: i + 1,
  bytes: (i + 1) * 100,
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  buckets = mockBuckets,
  onClose = vi.fn(),
  onComplete = vi.fn(),
}: {
  isOpen?: boolean
  buckets?: Bucket[]
  onClose?: () => void
  onComplete?: (result: { emptiedCount: number; totalDeleted: number; errors: string[] }) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EmptyBucketsModal isOpen={isOpen} buckets={buckets} onClose={onClose} onComplete={onComplete} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EmptyBucketsModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.isPending = false
    mockState.shouldFail = false
    mockState.failOnBucket = null
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Empty Buckets/i)).not.toBeInTheDocument()
    })

    test("does not render when buckets array is empty", () => {
      renderModal({ buckets: [] })
      expect(screen.queryByText(/Empty Buckets/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and buckets are provided", () => {
      renderModal()
      expect(screen.getByRole("dialog", { name: "Empty Buckets" })).toBeInTheDocument()
    })
  })

  describe("UI elements", () => {
    test("renders the plural title when multiple buckets are selected", () => {
      renderModal({ buckets: mockBuckets })
      expect(screen.getByRole("dialog", { name: "Empty Buckets" })).toBeInTheDocument()
    })

    test("renders the singular title when a single bucket is selected", () => {
      renderModal({ buckets: mockSingleBucket })
      expect(screen.getByRole("dialog", { name: "Empty Bucket" })).toBeInTheDocument()
    })

    test("shows warning message with bucket count (plural)", () => {
      renderModal({ buckets: mockBuckets })
      expect(screen.getByText(/This will permanently delete all objects from 3 selected buckets/)).toBeInTheDocument()
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })

    test("shows warning message with bucket count (singular)", () => {
      renderModal({ buckets: mockSingleBucket })
      expect(screen.getByText(/from 1 selected bucket/)).toBeInTheDocument()
    })

    test("displays list of buckets to empty", () => {
      renderModal()
      expect(screen.getByText("Buckets to empty:")).toBeInTheDocument()
      expect(screen.getByText("bucket-1")).toBeInTheDocument()
      expect(screen.getByText("bucket-2")).toBeInTheDocument()
      expect(screen.getByText("bucket-3")).toBeInTheDocument()
    })

    test("shows object count for non-empty buckets", () => {
      renderModal()
      expect(screen.getByText(/\(5 objects\)/)).toBeInTheDocument()
      expect(screen.getByText(/\(3 objects\)/)).toBeInTheDocument()
    })

    test("shows singular form for single object", () => {
      const singleObjectBucket: Bucket[] = [
        { name: "bucket-1", creationDate: "2024-01-15T10:00:00Z", count: 1, bytes: 100 },
      ]
      renderModal({ buckets: singleObjectBucket })
      expect(screen.getByText(/\(1 object\)/)).toBeInTheDocument()
    })

    test("does not show object count for empty buckets", () => {
      const emptyBucket: Bucket[] = [{ name: "empty-bucket", creationDate: "2024-01-15T10:00:00Z", count: 0, bytes: 0 }]
      renderModal({ buckets: emptyBucket })
      expect(screen.queryByText(/\(0 objects\)/)).not.toBeInTheDocument()
    })

    test("limits visible buckets to 20 and shows hidden count", () => {
      renderModal({ buckets: mockManyBuckets })
      expect(screen.getByText("bucket-1")).toBeInTheDocument()
      expect(screen.getByText("bucket-20")).toBeInTheDocument()
      expect(screen.queryByText("bucket-21")).not.toBeInTheDocument()
      expect(screen.getByText(/...and 5 more/)).toBeInTheDocument()
    })

    test("renders Empty button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Empty$/i })).toBeInTheDocument()
    })

    test("renders Cancel button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })
  })

  describe("Bucket emptying process", () => {
    test("calls mutateAsync for each bucket", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal({ buckets: mockBuckets })

      // Type "empty" to enable the button
      const confirmInput = screen.getByLabelText(/Type "empty" to confirm/i)
      await user.type(confirmInput, "empty")

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockMutateAsync).toHaveBeenCalledTimes(3)
          expect(mockMutateAsync).toHaveBeenCalledWith({
            project_id: mockProjectId,
            containerName: "bucket-1",
          })
          expect(mockMutateAsync).toHaveBeenCalledWith({
            project_id: mockProjectId,
            containerName: "bucket-2",
          })
          expect(mockMutateAsync).toHaveBeenCalledWith({
            project_id: mockProjectId,
            containerName: "bucket-3",
          })
        },
        { timeout: 3000 }
      )
    })
  })

  describe("Success handling", () => {
    test("calls onComplete with success result", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnComplete = vi.fn()
      renderModal({ buckets: mockBuckets, onComplete: mockOnComplete })

      // Type "empty" to enable the button
      const confirmInput = screen.getByLabelText(/Type "empty" to confirm/i)
      await user.type(confirmInput, "empty")

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockOnComplete).toHaveBeenCalledWith({
            emptiedCount: 3,
            totalDeleted: 15, // 3 buckets * 5 objects each
            errors: [],
          })
        },
        { timeout: 3000 }
      )
    })

    test("invalidates buckets query after success", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal({ buckets: mockBuckets })

      // Type "empty" to enable the button
      const confirmInput = screen.getByLabelText(/Type "empty" to confirm/i)
      await user.type(confirmInput, "empty")

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockInvalidate).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )
    })

    test("closes modal after completion", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      renderModal({ buckets: mockBuckets, onClose: mockOnClose })

      // Type "empty" to enable the button
      const confirmInput = screen.getByLabelText(/Type "empty" to confirm/i)
      await user.type(confirmInput, "empty")

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockOnClose).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )
    })
  })

  describe("Error handling", () => {
    test("continues with other buckets when one fails", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnComplete = vi.fn()
      mockState.failOnBucket = "bucket-2"
      renderModal({ buckets: mockBuckets, onComplete: mockOnComplete })

      // Type "empty" to enable the button
      const confirmInput = screen.getByLabelText(/Type "empty" to confirm/i)
      await user.type(confirmInput, "empty")

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockOnComplete).toHaveBeenCalledWith({
            emptiedCount: 2,
            totalDeleted: 10, // 2 successful buckets * 5 objects each
            errors: ["bucket-2: Failed to empty bucket bucket-2"],
          })
        },
        { timeout: 3000 }
      )
    })

    test("collects all errors from failed buckets", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnComplete = vi.fn()
      mockState.shouldFail = true
      renderModal({ buckets: mockBuckets, onComplete: mockOnComplete })

      // Type "empty" to enable the button
      const confirmInput = screen.getByLabelText(/Type "empty" to confirm/i)
      await user.type(confirmInput, "empty")

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockOnComplete).toHaveBeenCalledWith({
            emptiedCount: 0,
            totalDeleted: 0,
            errors: [
              "bucket-1: Failed to empty bucket bucket-1",
              "bucket-2: Failed to empty bucket bucket-2",
              "bucket-3: Failed to empty bucket bucket-3",
            ],
          })
        },
        { timeout: 3000 }
      )
    })

    test("does not invalidate query when all operations fail", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.shouldFail = true
      renderModal({ buckets: mockBuckets })

      // Type "empty" to enable the button
      const confirmInput = screen.getByLabelText(/Type "empty" to confirm/i)
      await user.type(confirmInput, "empty")

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockInvalidate).not.toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })

    test("invalidates query when some operations succeed", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.failOnBucket = "bucket-2"
      renderModal({ buckets: mockBuckets })

      // Type "empty" to enable the button
      const confirmInput = screen.getByLabelText(/Type "empty" to confirm/i)
      await user.type(confirmInput, "empty")

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockInvalidate).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )
    })
  })

  describe("Modal close behavior", () => {
    test("closes modal when Cancel button is clicked", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    test("resets mutation state when modal closes", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockReset).toHaveBeenCalled()
    })
  })
})
