import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteContainerModal } from "./DeleteContainerModal"
import type { ContainerSummary, ObjectSummary } from "@/server/Storage/types/swift"

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidate = vi.fn()

let mutationError: string | null = null
let listObjectsData: ObjectSummary[] = []
let listObjectsLoading = false

let capturedMutationOptions: {
  onSuccess?: () => void
  onError?: (error: { message: string }) => void
  onSettled?: () => void
} = {}

const mockMutate = vi.fn().mockImplementation(() => {
  if (mutationError) {
    capturedMutationOptions.onError?.({ message: mutationError })
  } else {
    capturedMutationOptions.onSuccess?.()
  }
  capturedMutationOptions.onSettled?.()
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          listContainers: { invalidate: mockInvalidate },
        },
      },
    }),
    storage: {
      swift: {
        listObjects: {
          useQuery: () => ({
            data: listObjectsData,
            isLoading: listObjectsLoading,
          }),
        },
        deleteContainer: {
          useMutation: (options: typeof capturedMutationOptions) => {
            capturedMutationOptions = options ?? {}
            return {
              mutate: mockMutate,
              reset: mockReset,
              isPending: false,
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
  count: 0,
  bytes: 0,
  last_modified: "2024-01-15T10:30:00.000000",
  ...overrides,
})

const makeObject = (name: string, overrides: Partial<ObjectSummary> = {}): ObjectSummary => ({
  name,
  bytes: 1024,
  content_type: "text/plain",
  hash: "abc123",
  last_modified: "2024-01-15T10:30:00.000000",
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
        <DeleteContainerModal
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

describe("DeleteContainerModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mutationError = null
    listObjectsData = []
    listObjectsLoading = false
    capturedMutationOptions = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Delete container/i)).not.toBeInTheDocument()
    })

    test("does not render when container is null", () => {
      renderModal({ container: null })
      expect(screen.queryByText(/Delete container/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and container is set", () => {
      renderModal()
      expect(screen.getByText("my-container")).toBeInTheDocument()
    })

    test("renders modal title with container name", () => {
      renderModal({ container: makeContainer({ name: "special-container" }) })
      expect(screen.getByText("special-container")).toBeInTheDocument()
    })
  })

  describe("Loading state", () => {
    test("shows loading spinner while fetching objects", () => {
      listObjectsLoading = true
      renderModal()
      expect(screen.getByText(/Loading/i)).toBeInTheDocument()
    })

    test("confirm button is disabled while loading", () => {
      listObjectsLoading = true
      renderModal()
      const buttons = screen.getAllByRole("button")
      const confirmButton = buttons.find((btn) => btn.textContent?.match(/Delete|Got it/i))
      expect(confirmButton).toBeDisabled()
    })
  })

  describe("Case 1: container is empty — allow deletion", () => {
    test("renders danger warning message", () => {
      renderModal()
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument()
    })

    test("renders confirmation text input", () => {
      renderModal()
      expect(screen.getByLabelText(/Type container name to confirm/i)).toBeInTheDocument()
    })

    test("renders Delete and Cancel buttons", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("Delete button is disabled when confirm input is empty", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeDisabled()
    })

    test("Delete button is disabled when confirm input has wrong name", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "wrong-name")
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeDisabled()
    })

    test("Delete button is enabled when confirm input matches container name", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "my-container")
      expect(screen.getByRole("button", { name: /^Delete$/i })).not.toBeDisabled()
    })

    test("shows copy icon button in title", () => {
      renderModal()
      expect(screen.getByTitle(/Copy container name/i)).toBeInTheDocument()
    })
  })

  describe("Case 2: container has objects — block deletion", () => {
    beforeEach(() => {
      listObjectsData = [makeObject("file1.txt")]
    })

    test("renders error message about non-empty container", () => {
      renderModal({ container: makeContainer({ count: 1 }) })
      expect(screen.getByText(/Cannot delete. Container contains objects. Please empty it first/i)).toBeInTheDocument()
    })

    test("renders Got it! button instead of Delete", () => {
      renderModal({ container: makeContainer({ count: 1 }) })
      expect(screen.getByRole("button", { name: /Got it!/i })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /^Delete$/i })).not.toBeInTheDocument()
    })

    test("does not render confirmation text input", () => {
      renderModal({ container: makeContainer({ count: 1 }) })
      expect(screen.queryByLabelText(/Type container name to confirm/i)).not.toBeInTheDocument()
    })

    test("does not render copy icon button", () => {
      renderModal({ container: makeContainer({ count: 1 }) })
      expect(screen.queryByTitle(/Copy container name/i)).not.toBeInTheDocument()
    })

    test("calls onClose when Got it! is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ container: makeContainer({ count: 1 }), onClose })
      await user.click(screen.getByRole("button", { name: /Got it!/i }))
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  describe("Case 2b: container.count > 0 but listed === 0 (consistency delay)", () => {
    test("still blocks deletion when container.count > 0", () => {
      listObjectsData = []
      renderModal({ container: makeContainer({ count: 5 }) })
      expect(screen.getByText(/Cannot delete. Container contains objects/i)).toBeInTheDocument()
    })

    test("renders Got it! button when count > 0 even if listed === 0", () => {
      listObjectsData = []
      renderModal({ container: makeContainer({ count: 5 }) })
      expect(screen.getByRole("button", { name: /Got it!/i })).toBeInTheDocument()
    })
  })

  describe("Validation", () => {
    test("shows error when submitting with wrong container name", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "wrong-name")
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/Container name does not match/i)).toBeInTheDocument()
      })
    })

    test("clears validation error when input changes", async () => {
      const user = userEvent.setup()
      renderModal()
      const input = screen.getByLabelText(/Type container name to confirm/i)
      await user.type(input, "wrong")
      await user.keyboard("{Enter}")
      await waitFor(() => {
        expect(screen.getByText(/Container name does not match/i)).toBeInTheDocument()
      })
      await user.type(input, "-more")
      await waitFor(() => {
        expect(screen.queryByText(/Container name does not match/i)).not.toBeInTheDocument()
      })
    })
  })

  describe("Submission", () => {
    test("calls mutate with container name when Delete is clicked with correct name", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "my-container")
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(mockMutate).toHaveBeenCalledWith({ container: "my-container" })
    })

    test("calls mutate on Enter key press with correct name", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "my-container")
      await user.keyboard("{Enter}")
      expect(mockMutate).toHaveBeenCalledWith({ container: "my-container" })
    })

    test("calls onSuccess with container name after successful mutation", async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "my-container")
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("my-container")
      })
    })

    test("calls listContainers.invalidate after successful mutation", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "my-container")
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled()
      })
    })

    test("does not call mutate when confirm name does not match", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "wrong-name")
      await user.keyboard("{Enter}")
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })

  describe("Error handling", () => {
    test("calls onError with container name and error message on mutation failure", async () => {
      mutationError = "Container not found"
      const onError = vi.fn()
      const user = userEvent.setup()
      renderModal({ onError })
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "my-container")
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("my-container", "Container not found")
      })
    })
  })

  describe("Cancel / close", () => {
    test("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("resets confirm input when modal closes and reopens", async () => {
      const { rerender } = render(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <DeleteContainerModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      const user = userEvent.setup()
      await user.type(screen.getByLabelText(/Type container name to confirm/i), "my-container")
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <DeleteContainerModal isOpen={false} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <DeleteContainerModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await waitFor(() => {
        expect(screen.getByLabelText(/Type container name to confirm/i)).toHaveValue("")
      })
    })
  })

  describe("Copy to clipboard", () => {
    test("copy button shows Copied! title after click", async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      })
      renderModal()
      await user.click(screen.getByTitle(/Copy container name/i))
      await waitFor(() => {
        expect(screen.getByTitle(/Copied!/i)).toBeInTheDocument()
      })
    })
  })
})
