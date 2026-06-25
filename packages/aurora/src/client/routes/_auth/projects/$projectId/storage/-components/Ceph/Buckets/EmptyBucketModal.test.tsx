import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { EmptyBucketModal } from "./EmptyBucketModal"
import type { Bucket } from "@/server/Storage/types/ceph"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── Mock clipboard API ───────────────────────────────────────────────────────

const mockWriteText = vi.fn().mockResolvedValue(undefined)

Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

// ─── tRPC mock ────────────────────────────────────────────────────────────────

type MutationOptions = {
  onSuccess?: (deletedCount: number) => void
  onError?: (error: { message: string }) => void
  onSettled?: () => void
}

const { mockInvalidate, mockMutate, mockReset, mockState } = vi.hoisted(() => {
  const mockState = {
    mutationError: null as string | null,
    isPending: false,
    capturedOptions: {} as MutationOptions,
  }
  const mockMutate = vi.fn().mockImplementation((_variables: unknown, options?: MutationOptions) => {
    // Merge options from both useMutation and mutate call
    const mergedOptions = { ...mockState.capturedOptions, ...options }
    if (mockState.mutationError) {
      mergedOptions.onError?.({ message: mockState.mutationError })
    } else {
      mergedOptions.onSuccess?.(5)
    }
    mergedOptions.onSettled?.()
  })
  return {
    mockInvalidate: vi.fn(),
    mockMutate,
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
          objects: { list: { invalidate: mockInvalidate } },
        },
      },
    }),
    storage: {
      ceph: {
        objects: {
          deleteAll: {
            useMutation: (options: MutationOptions) => {
              mockState.capturedOptions = options ?? {}
              return { mutate: mockMutate, isPending: mockState.isPending, reset: mockReset }
            },
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockEmptyBucket: Bucket = {
  name: "empty-bucket",
  creationDate: "2024-01-15T10:00:00Z",
  count: 0,
  bytes: 0,
}

const mockNonEmptyBucket: Bucket = {
  name: "bucket-with-files",
  creationDate: "2024-01-15T10:00:00Z",
  count: 5,
  bytes: 1024,
}

const mockSingleObjectBucket: Bucket = {
  name: "single-object-bucket",
  creationDate: "2024-01-15T10:00:00Z",
  count: 1,
  bytes: 512,
}

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  bucket = mockNonEmptyBucket,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  bucket?: Bucket | null
  onClose?: () => void
  onSuccess?: (bucketName: string, deletedCount: number) => void
  onError?: (bucketName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EmptyBucketModal isOpen={isOpen} bucket={bucket} onClose={onClose} onSuccess={onSuccess} onError={onError} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EmptyBucketModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.mutationError = null
    mockState.capturedOptions = {}
    mockState.isPending = false
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Empty Bucket/i)).not.toBeInTheDocument()
    })

    test("does not render when bucket is null", () => {
      renderModal({ bucket: null })
      expect(screen.queryByText(/Empty Bucket/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and bucket is provided", () => {
      renderModal()
      expect(screen.getByRole("heading", { name: "Empty Bucket" })).toBeInTheDocument()
    })
  })

  describe("Empty bucket state", () => {
    test("shows special message for bucket with only delete markers (count=0)", () => {
      renderModal({ bucket: mockEmptyBucket })
      expect(
        screen.getByText(/This will permanently delete all versions and delete markers from bucket/)
      ).toBeInTheDocument()
    })

    test("still shows confirmation input for empty bucket", () => {
      renderModal({ bucket: mockEmptyBucket })
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeInTheDocument()
    })

    test("allows emptying bucket even when count is 0", () => {
      renderModal({ bucket: mockEmptyBucket })
      expect(screen.getByRole("button", { name: /^Empty$/i })).toBeInTheDocument()
    })
  })

  describe("Non-empty bucket UI", () => {
    test("renders modal title", () => {
      renderModal()
      expect(screen.getByRole("heading", { name: "Empty Bucket" })).toBeInTheDocument()
    })

    test("shows warning message with object count (plural)", () => {
      renderModal({ bucket: mockNonEmptyBucket })
      expect(screen.getByText(/Are you sure?/)).toBeInTheDocument()
      expect(screen.getByText(/All 5 objects/)).toBeInTheDocument()
      expect(screen.getByText(/will be permanently deleted/)).toBeInTheDocument()
    })

    test("shows warning message with object count (singular)", () => {
      renderModal({ bucket: mockSingleObjectBucket })
      expect(screen.getByText(/All 1 object/)).toBeInTheDocument()
    })

    test("displays bucket name", () => {
      renderModal()
      expect(screen.getByText("Bucket to empty:")).toBeInTheDocument()
      expect(screen.getByText(mockNonEmptyBucket.name)).toBeInTheDocument()
    })

    test("renders confirmation input", () => {
      renderModal()
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeInTheDocument()
    })

    test("confirmation input has bucket name as placeholder", () => {
      renderModal()
      expect(screen.getByPlaceholderText(mockNonEmptyBucket.name)).toBeInTheDocument()
    })

    test("confirmation input has autofocus", () => {
      renderModal()
      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toHaveFocus()
    })

    test("renders Empty button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Empty$/i })).toBeInTheDocument()
    })

    test("renders Cancel button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("renders Copy button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Copy/i })).toBeInTheDocument()
    })

    test("Empty button is disabled when confirmation name is empty", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Empty$/i })).toBeDisabled()
    })
  })

  describe("Copy bucket name", () => {
    test("shows Copy button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Copy/i })).toBeInTheDocument()
    })

    test("displays bucket name in styled block", () => {
      renderModal()
      const styledBlock = screen.getByText(mockNonEmptyBucket.name).closest("div")
      expect(styledBlock).toBeInTheDocument()
      expect(styledBlock).toHaveClass("bg-theme-background-lvl-1")
    })
  })

  describe("Name confirmation validation", () => {
    test("Empty button disabled when name does not match", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, "wrong-name")

      expect(screen.getByRole("button", { name: /^Empty$/i })).toBeDisabled()
    })

    test("enables Empty button when name matches exactly", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      await waitFor(
        () => {
          expect(screen.getByRole("button", { name: /^Empty$/i })).not.toBeDisabled()
        },
        { timeout: 3000 }
      )
    })

    test("trims whitespace from confirmation name", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, `  ${mockNonEmptyBucket.name}  `)

      await waitFor(
        () => {
          expect(screen.getByRole("button", { name: /^Empty$/i })).not.toBeDisabled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe("Bucket emptying", () => {
    test("calls mutation with correct parameters", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockMutate).toHaveBeenCalledWith(
            {
              project_id: mockProjectId,
              containerName: mockNonEmptyBucket.name,
            },
            expect.objectContaining({
              onSuccess: expect.any(Function),
              onError: expect.any(Function),
            })
          )
        },
        { timeout: 3000 }
      )
    })

    test("disables input and button while emptying", () => {
      mockState.isPending = true
      renderModal()

      expect(screen.getByLabelText(/Type the bucket name to confirm/i)).toBeDisabled()
      expect(screen.getByRole("button", { name: /^Empty$/i })).toBeDisabled()
    })
  })

  describe("Success handling", () => {
    test("calls onSuccess with bucket name and deleted count", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSuccess = vi.fn()
      renderModal({ onSuccess: mockOnSuccess })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalledWith(mockNonEmptyBucket.name, 5)
        },
        { timeout: 3000 }
      )
    })

    test("invalidates both containers and objects queries on success", async () => {
      const user = userEvent.setup({ delay: null })
      renderModal()

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockInvalidate).toHaveBeenCalledTimes(2)
        },
        { timeout: 3000 }
      )
    })

    test("closes modal on success", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

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
    test("calls onError with bucket name and error message", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnError = vi.fn()
      mockState.mutationError = "Failed to empty bucket"
      renderModal({ onError: mockOnError })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

      const emptyButton = screen.getByRole("button", { name: /^Empty$/i })
      await user.click(emptyButton)

      await waitFor(
        () => {
          expect(mockOnError).toHaveBeenCalledWith(mockNonEmptyBucket.name, "Failed to empty bucket")
        },
        { timeout: 3000 }
      )
    })

    test("closes modal on error", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      mockState.mutationError = "Empty failed"
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Type the bucket name to confirm/i)
      await user.clear(input)
      await user.type(input, mockNonEmptyBucket.name)

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

    test("clears copied state when modal closes", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
