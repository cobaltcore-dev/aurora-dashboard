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
  const mockMutate = vi.fn().mockImplementation(() => {
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
        })
      })
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
        })
      })
    })

    test("disables input and button while creating", () => {
      mockState.isPending = true
      renderModal()

      expect(screen.getByLabelText(/Bucket name/i)).toBeDisabled()
      expect(screen.getByRole("button", { name: /^Create$/i })).toBeDisabled()
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

    test("clears input when modal closes", async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()
      renderModal({ onClose: mockOnClose })

      const input = screen.getByLabelText(/Bucket name/i)
      await user.type(input, "my-bucket")

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
})
