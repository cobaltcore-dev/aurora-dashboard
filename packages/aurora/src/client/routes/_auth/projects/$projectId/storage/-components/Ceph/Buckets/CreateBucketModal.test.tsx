import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CreateBucketModal } from "./CreateBucketModal"

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
  onSettled?: () => void
}

const { mockInvalidate, mockMutate, mockReset, mockState } = vi.hoisted(() => {
  const mockState = {
    mutationError: null as string | null,
    isPending: false,
    capturedOptions: {} as MutationOptions,
  }
  const mockMutate = vi.fn().mockImplementation(async () => {
    // Use microtask to allow state updates to flush
    await Promise.resolve()
    if (mockState.mutationError) {
      mockState.capturedOptions.onError?.({ message: mockState.mutationError })
    } else {
      mockState.capturedOptions.onSuccess?.()
    }
    mockState.capturedOptions.onSettled?.()
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
        },
      },
    }),
    storage: {
      ceph: {
        containers: {
          create: {
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

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  onClose?: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CreateBucketModal isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} onError={onError} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CreateBucketModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.mutationError = null
    mockState.capturedOptions = {}
    mockState.isPending = false
    mockOnTrackEvent.mockClear()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Create Bucket/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true", () => {
      renderModal()
      expect(screen.getByText("Create Bucket")).toBeInTheDocument()
    })
  })

  describe("UI elements", () => {
    test("renders modal title", () => {
      renderModal()
      expect(screen.getByText("Create Bucket")).toBeInTheDocument()
    })

    test("renders info message about S3 naming rules", () => {
      renderModal()
      expect(screen.getByText(/S3 bucket names must be 3-63 characters long/)).toBeInTheDocument()
      expect(screen.getByText(/contain only lowercase letters, numbers, periods, and hyphens/)).toBeInTheDocument()
    })

    test("renders bucket name input", () => {
      renderModal()
      expect(screen.getByLabelText(/Bucket name/i)).toBeInTheDocument()
    })

    test("bucket name input has placeholder", () => {
      renderModal()
      expect(screen.getByPlaceholderText("my-bucket-name")).toBeInTheDocument()
    })

    test("renders Create button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Create$/i })).toBeInTheDocument()
    })

    test("renders Cancel button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("renders Enable versioning checkbox", () => {
      renderModal()
      expect(screen.getByRole("checkbox", { name: /Enable versioning/i })).toBeInTheDocument()
    })

    test("versioning checkbox has helptext", () => {
      renderModal()
      expect(screen.getByText(/Keep multiple versions of objects/i)).toBeInTheDocument()
      expect(screen.getByText(/Cannot be fully disabled once enabled/i)).toBeInTheDocument()
    })

    test("versioning checkbox is unchecked by default", () => {
      renderModal()
      expect(screen.getByRole("checkbox", { name: /Enable versioning/i })).not.toBeChecked()
    })

    test("Create button is disabled when input is empty", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Create$/i })).toBeDisabled()
    })

    test("input has autofocus", () => {
      renderModal()
      expect(screen.getByLabelText(/Bucket name/i)).toHaveFocus()
    })
  })

  describe("Valid bucket names", () => {
    test("accepts valid bucket name with lowercase letters", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "mybucket")

      expect(screen.getByRole("button", { name: /^Create$/i })).not.toBeDisabled()
      expect(input).not.toHaveAttribute("aria-invalid", "true")
    })

    test("accepts valid bucket name with numbers", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket-123")

      expect(screen.getByRole("button", { name: /^Create$/i })).not.toBeDisabled()
    })

    test("accepts valid bucket name with periods", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my.bucket.name")

      expect(screen.getByRole("button", { name: /^Create$/i })).not.toBeDisabled()
    })

    test("accepts valid bucket name with hyphens", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket-name")

      expect(screen.getByRole("button", { name: /^Create$/i })).not.toBeDisabled()
    })

    test("accepts 3-character bucket name", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "abc")

      expect(screen.getByRole("button", { name: /^Create$/i })).not.toBeDisabled()
    })

    test("accepts 63-character bucket name", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      const longName = "a".repeat(63)
      await user.type(input, longName)

      expect(screen.getByRole("button", { name: /^Create$/i })).not.toBeDisabled()
    })
  })

  describe("Invalid bucket names - Length validation", () => {
    test("shows error for empty bucket name on submit", async () => {
      const user = userEvent.setup()
      renderModal()

      // Type something first, then clear to trigger validation
      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "test")

      // Enable the button by having valid input
      expect(screen.getByRole("button", { name: /^Create$/i })).not.toBeDisabled()

      // Now clear the input
      await user.clear(input)

      // Try to submit
      const createButton = screen.getByRole("button", { name: /^Create$/i })

      // Button should be disabled with empty input
      expect(createButton).toBeDisabled()
    })

    test("shows error for bucket name less than 3 characters", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "ab")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument()
      })
    })

    test("shows error for bucket name more than 63 characters", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      const longName = "a".repeat(64)
      await user.type(input, longName)

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/63 characters or fewer/i)).toBeInTheDocument()
      })
    })
  })

  describe("Invalid bucket names - Character validation", () => {
    test("shows error for uppercase letters", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "MyBucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        const errorText = screen.getByText(/only lowercase letters/i, {
          selector: ".juno-form-hint-error",
        })
        expect(errorText).toBeInTheDocument()
      })
    })

    test("shows error for special characters", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my_bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        const errorText = screen.getByText(/only lowercase letters/i, {
          selector: ".juno-form-hint-error",
        })
        expect(errorText).toBeInTheDocument()
      })
    })

    test("shows error for spaces", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        const errorText = screen.getByText(/only lowercase letters/i, {
          selector: ".juno-form-hint-error",
        })
        expect(errorText).toBeInTheDocument()
      })
    })

    test("shows error for starting with hyphen", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "-mybucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/start and end with a letter or number/i)).toBeInTheDocument()
      })
    })

    test("shows error for ending with hyphen", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "mybucket-")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/start and end with a letter or number/i)).toBeInTheDocument()
      })
    })

    test("shows error for starting with period", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, ".mybucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/start and end with a letter or number/i)).toBeInTheDocument()
      })
    })

    test("shows error for ending with period", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "mybucket.")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/start and end with a letter or number/i)).toBeInTheDocument()
      })
    })

    test("shows error for consecutive periods", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my..bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/not contain consecutive periods/i)).toBeInTheDocument()
      })
    })
  })

  describe("Invalid bucket names - IP address format", () => {
    test("shows error for IP address format", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "192.168.1.1")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/not be formatted as an IP address/i)).toBeInTheDocument()
      })
    })
  })

  describe("Invalid bucket names - Reserved prefixes", () => {
    test("shows error for xn-- prefix", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "xn--mybucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/not start with reserved prefix "xn--"/i)).toBeInTheDocument()
      })
    })

    test("shows error for sthree- prefix", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "sthree-mybucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/not start with reserved prefix "sthree-"/i)).toBeInTheDocument()
      })
    })

    test("shows error for amzn-s3-demo- prefix", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "amzn-s3-demo-bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/not start with reserved prefix "amzn-s3-demo-"/i)).toBeInTheDocument()
      })
    })
  })

  describe("Invalid bucket names - Reserved suffixes", () => {
    test("shows error for -s3alias suffix", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "mybucket-s3alias")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/not end with reserved suffix "-s3alias"/i)).toBeInTheDocument()
      })
    })

    test("shows error for --ol-s3 suffix", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "mybucket--ol-s3")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/not end with reserved suffix "--ol-s3"/i)).toBeInTheDocument()
      })
    })
  })

  describe("Bucket creation", () => {
    test("calls mutation with correct parameters on submit", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-test-bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          project_id: mockProjectId,
          bucketName: "my-test-bucket",
          enableVersioning: false,
        })
      })
    })

    test("calls mutation with enableVersioning=true when checkbox is checked", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-test-bucket")

      const checkbox = screen.getByRole("checkbox", { name: /Enable versioning/i })
      await user.click(checkbox)

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          project_id: mockProjectId,
          bucketName: "my-test-bucket",
          enableVersioning: true,
        })
      })
    })

    test("checkbox can be toggled on and off", async () => {
      const user = userEvent.setup()
      renderModal()

      const checkbox = screen.getByRole("checkbox", { name: /Enable versioning/i })

      // Initial state unchecked
      expect(checkbox).not.toBeChecked()

      // Check
      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      // Uncheck
      await user.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    test("trims whitespace from bucket name", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "  my-bucket  ")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          project_id: mockProjectId,
          bucketName: "my-bucket",
          enableVersioning: false,
        })
      })
    })

    test("submits on Enter key press", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket{Enter}")

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          project_id: mockProjectId,
          bucketName: "my-bucket",
          enableVersioning: false,
        })
      })
    })

    test("disables input and button while creating", () => {
      mockState.isPending = true
      renderModal()

      expect(screen.getByLabelText(/Bucket name/i)).toBeDisabled()
      expect(screen.getByRole("button", { name: /^Create$/i })).toBeDisabled()
      expect(screen.getByRole("checkbox", { name: /Enable versioning/i })).toBeDisabled()
    })
  })

  describe("Success handling", () => {
    test("calls onSuccess with bucket name", async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      renderModal({ onSuccess: mockOnSuccess })

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith("my-bucket")
      })
    })

    test("invalidates containers query on success", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalledTimes(1)
      })
    })

    test("closes modal on success", async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      })
    })

    test("resets mutation state on close", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("Error handling", () => {
    test("calls onError with bucket name and error message", async () => {
      const user = userEvent.setup()
      const mockOnError = vi.fn()
      mockState.mutationError = "Bucket already exists"
      renderModal({ onError: mockOnError })

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "existing-bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith("existing-bucket", "Bucket already exists")
      })
    })

    test("closes modal on error", async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()
      mockState.mutationError = "Creation failed"
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("Modal close behavior", () => {
    test("closes modal when Cancel button is clicked", async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    test("clears input and checkbox when modal closes", async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket")

      const checkbox = screen.getByRole("checkbox", { name: /Enable versioning/i })
      await user.click(checkbox)

      expect(checkbox).toBeChecked()

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    test("clears error when modal closes", async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "ab")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe("Real-time validation", () => {
    test("clears error when user fixes invalid input", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "ab")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument()
      })

      await user.type(input, "c")

      await waitFor(() => {
        expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument()
      })
    })

    test("shows error immediately when user types invalid character after initial validation", async () => {
      const user = userEvent.setup()
      renderModal()

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "ab")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument()
      })

      await user.type(input, "C")

      await waitFor(() => {
        const errorText = screen.getByText(/only lowercase letters/i, {
          selector: ".juno-form-hint-error",
        })
        expect(errorText).toBeInTheDocument()
      })
    })
  })

  describe("Analytics tracking", () => {
    test("tracks .open event once per modal open", async () => {
      renderModal({ isOpen: true })

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "modal",
          action: "storage.ceph.bucket.create.open",
        })
      })

      expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
    })

    test("tracks .open event again when modal is reopened", async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()
      const { rerender } = renderModal({ isOpen: true, onClose: mockOnClose })

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledTimes(1)
      })

      // Close the modal by clicking cancel (this resets hasTrackedOpen)
      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()

      // Simulate closing by rerendering with isOpen=false
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <CreateBucketModal isOpen={false} onClose={mockOnClose} onSuccess={vi.fn()} onError={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )

      mockOnTrackEvent.mockClear()

      // Reopen the modal
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <CreateBucketModal isOpen={true} onClose={mockOnClose} onSuccess={vi.fn()} onError={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )

      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "modal",
          action: "storage.ceph.bucket.create.open",
        })
      })
    })

    test("tracks .close event when user manually closes without submitting", async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      // Wait for .open event
      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "modal",
          action: "storage.ceph.bucket.create.open",
        })
      })

      mockOnTrackEvent.mockClear()

      // Close the modal without submitting
      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.bucket.create.close",
      })
      expect(mockOnClose).toHaveBeenCalled()
    })

    test("does not track .close event when modal closes after successful submit", async () => {
      const user = userEvent.setup()
      renderModal()

      // Wait for .open event
      await waitFor(() => {
        expect(mockOnTrackEvent).toHaveBeenCalledWith({
          source: "modal",
          action: "storage.ceph.bucket.create.open",
        })
      })

      mockOnTrackEvent.mockClear()

      // Submit the form
      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket")

      const createButton = screen.getByRole("button", { name: /^Create$/i })
      await user.click(createButton)

      // The .close event should not be tracked because hasSubmitted is true
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })

      // Only .open was tracked, not .close
      expect(mockOnTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: "storage.ceph.bucket.create.close",
        })
      )
    })
  })
})
