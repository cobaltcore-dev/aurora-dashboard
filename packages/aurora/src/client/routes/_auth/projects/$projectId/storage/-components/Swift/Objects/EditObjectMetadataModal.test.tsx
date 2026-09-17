import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { EditObjectMetadataModal } from "./EditObjectMetadataModal"
import type { ObjectMetadata } from "@/server/Storage/types/swift"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidateObjectMetadata = vi.fn()
const mockInvalidateListObjects = vi.fn()

let metadataLoading = false
let metadataError: { message: string } | null = null
let mockObjectMetadata: ObjectMetadata | undefined = undefined
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

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useParams: vi.fn(() => ({
      accountId: "test-account",
      projectId: "test-project",
      provider: "swift",
      containerName: "test-container",
    })),
  }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          getObjectMetadata: { invalidate: mockInvalidateObjectMetadata },
          listObjects: { invalidate: mockInvalidateListObjects },
        },
      },
    }),
    storage: {
      swift: {
        getObjectMetadata: {
          useQuery: () => ({
            data: mockObjectMetadata,
            isLoading: metadataLoading,
            isError: metadataError !== null,
            error: metadataError,
          }),
        },
        updateObjectMetadata: {
          useMutation: (options: typeof capturedMutationOptions) => {
            capturedMutationOptions = options ?? {}
            return {
              mutate: mockMutate,
              reset: mockReset,
              isPending: mutationIsPending,
              isError: mutationError !== null && !mutationIsPending,
              error: mutationError ? { message: mutationError } : null,
            }
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeObjectRow = (
  overrides: Partial<{
    name: string
    displayName: string
    bytes: number
    last_modified: string
    content_type: string
  }> = {}
) => ({
  kind: "object" as const,
  name: "sample.txt",
  displayName: "sample.txt",
  bytes: 1024,
  last_modified: "2026-04-16T13:29:04.000000",
  content_type: "text/plain",
  ...overrides,
})

const makeObjectMetadata = (overrides: Partial<ObjectMetadata> = {}): ObjectMetadata => ({
  contentType: "text/plain",
  contentLength: 1024,
  etag: "abc123",
  lastModified: "2026-04-16T13:29:05.000000",
  ...overrides,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getIconButton = (name: RegExp) =>
  screen.getAllByRole("button").find((btn) => name.test(btn.getAttribute("title") ?? ""))!

const getModalUpdateButton = () => screen.getByRole("button", { name: /Update object/i })

const flushEffects = () => act(async () => {})

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  object = makeObjectRow(),
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  object?: ReturnType<typeof makeObjectRow> | null
  onClose?: () => void
  onSuccess?: (name: string) => void
  onError?: (name: string, error: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EditObjectMetadataModal
          isOpen={isOpen}
          object={object}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EditObjectMetadataModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    metadataLoading = false
    metadataError = null
    mockObjectMetadata = undefined
    mutationError = null
    mutationIsPending = false
    capturedMutationOptions = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  // ── Visibility ──────────────────────────────────────────────────────────────

  test("renders nothing when closed or object is null", () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText(/Edit metadata:/i)).not.toBeInTheDocument()

    renderModal({ isOpen: true, object: null })
    expect(screen.queryByText(/Edit metadata:/i)).not.toBeInTheDocument()
  })

  test("renders modal with object name when open", async () => {
    mockObjectMetadata = makeObjectMetadata()
    renderModal()
    await flushEffects()
    expect(screen.getByText("Edit metadata:")).toBeInTheDocument()
    expect(screen.getByText("sample.txt")).toBeInTheDocument()
  })

  // ── Loading & error states ──────────────────────────────────────────────────

  test("shows loading spinner while fetching metadata", () => {
    metadataLoading = true
    renderModal()
    expect(screen.getByText(/Loading object properties/i)).toBeInTheDocument()
  })

  test("shows error message when metadata fetch fails", () => {
    metadataError = { message: "Not found" }
    renderModal()
    expect(screen.getByText(/Failed to load object metadata/i)).toBeInTheDocument()
    expect(screen.getByText(/Not found/)).toBeInTheDocument()
  })

  // ── Custom metadata validation ──────────────────────────────────────────────

  test("validates metadata key is required", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.click(getIconButton(/^Save$/i))
    await waitFor(() => {
      expect(screen.getByText(/Key is required/i)).toBeInTheDocument()
    })
  })

  test("validates metadata key contains only valid characters", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "invalid key")
    await user.click(getIconButton(/^Save$/i))
    await waitFor(() => {
      expect(screen.getByText(/Key contains invalid characters/i)).toBeInTheDocument()
    })
  })

  test("validates metadata key has at least one alphanumeric character", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "----")
    await user.click(getIconButton(/^Save$/i))
    await waitFor(() => {
      expect(screen.getByText(/Key must contain at least one alphanumeric character/i)).toBeInTheDocument()
    })
  })

  test("accepts valid metadata key with hyphens", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "my-key-1")
    await user.type(screen.getByPlaceholderText(/Value/i), "val")
    await user.click(getIconButton(/^Save$/i))
    await waitFor(() => {
      expect(screen.getByText("my-key-1")).toBeInTheDocument()
    })
  })

  // ── Expires at validation ───────────────────────────────────────────────────

  test("validates expires at timestamp format", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderModal()
    await flushEffects()
    await user.type(screen.getByLabelText(/Expires at/i), "not-a-date")
    act(() => vi.advanceTimersByTime(700))
    await waitFor(() => {
      expect(screen.getByText(/Expected format: YYYY-MM-DD HH:mm:ss/i)).toBeInTheDocument()
    })
    vi.useRealTimers()
  }, 10000)

  test("blocks submission when expires at format is invalid", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    const input = screen.getByLabelText(/Expires at/i)
    await user.clear(input)
    await user.type(input, "bad-format")
    await user.click(getModalUpdateButton())
    expect(mockMutate).not.toHaveBeenCalled()
  })

  // ── Metadata CRUD ───────────────────────────────────────────────────────────

  test("adds new metadata entry", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "new-key")
    await user.type(screen.getByPlaceholderText(/Value/i), "new-value")
    await user.click(getIconButton(/^Save$/i))
    await waitFor(() => {
      expect(screen.getByText("new-key")).toBeInTheDocument()
      expect(screen.getByText("new-value")).toBeInTheDocument()
    })
  })

  test("edits existing metadata entry", async () => {
    mockObjectMetadata = makeObjectMetadata({ customMetadata: { author: "Alice" } })
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.click(getIconButton(/^Edit$/i))
    const valueInputs = screen.getAllByRole("textbox").filter((i) => i.getAttribute("value") === "Alice")
    await user.clear(valueInputs[0])
    await user.type(valueInputs[0], "Bob")
    await user.click(getIconButton(/^Save$/i))
    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument()
    })
  })

  test("deletes metadata entry", async () => {
    mockObjectMetadata = makeObjectMetadata({ customMetadata: { author: "Alice" } })
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.click(getIconButton(/^Delete$/i))
    await waitFor(() => {
      expect(screen.queryByText("author")).not.toBeInTheDocument()
      expect(screen.getByText(/No custom metadata/i)).toBeInTheDocument()
    })
  })

  test("discards unsaved new entry", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "discard-me")
    await user.click(getIconButton(/Discard/i))
    await waitFor(() => {
      expect(screen.queryByText("discard-me")).not.toBeInTheDocument()
      expect(screen.getByText(/No custom metadata/i)).toBeInTheDocument()
    })
  })

  // ── Submission ──────────────────────────────────────────────────────────────

  test("submits metadata changes with correct parameters", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "owner")
    await user.type(screen.getByPlaceholderText(/Value/i), "Alice")
    await user.click(getIconButton(/^Save$/i))
    await user.click(getModalUpdateButton())
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: mockProjectId,
        container: "test-container",
        object: "sample.txt",
        metadata: expect.objectContaining({ owner: "Alice" }),
      })
    )
  })

  test("submits deleteAt when expires at is set", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    await user.type(screen.getByLabelText(/Expires at/i), "2026-05-16 18:14:57")
    await user.click(getModalUpdateButton())
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: mockProjectId, deleteAt: expect.any(Number) })
    )
  })

  test("calls onSuccess and invalidates cache after successful mutation", async () => {
    const onSuccess = vi.fn()
    mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
    const user = userEvent.setup()
    renderModal({ onSuccess })
    await flushEffects()
    await user.click(getIconButton(/^Delete$/i))
    await user.click(getModalUpdateButton())
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("sample.txt")
      expect(mockInvalidateObjectMetadata).toHaveBeenCalled()
      expect(mockInvalidateListObjects).toHaveBeenCalled()
    })
  })

  test("calls onError and shows error message on mutation failure", async () => {
    mutationError = "Forbidden"
    const onError = vi.fn()
    mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
    const user = userEvent.setup()
    renderModal({ onError })
    await flushEffects()
    await user.click(getIconButton(/^Delete$/i))
    await user.click(getModalUpdateButton())
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("sample.txt", "Forbidden")
      expect(screen.getByText(/Failed to update object/i)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })
  })

  // ── Modal lifecycle ─────────────────────────────────────────────────────────

  test("closes modal on cancel", async () => {
    const onClose = vi.fn()
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal({ onClose })
    await flushEffects()
    await user.click(screen.getByRole("button", { name: /Cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  test("resets form state when modal is reopened", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <EditObjectMetadataModal isOpen={true} object={makeObjectRow()} onClose={vi.fn()} />
        </PortalProvider>
      </I18nProvider>
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Expires at/i), "2026-05-16 18:14:57")
    rerender(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <EditObjectMetadataModal isOpen={false} object={makeObjectRow()} onClose={vi.fn()} />
        </PortalProvider>
      </I18nProvider>
    )
    rerender(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <EditObjectMetadataModal isOpen={true} object={makeObjectRow()} onClose={vi.fn()} />
        </PortalProvider>
      </I18nProvider>
    )
    await waitFor(() => {
      expect(screen.getByLabelText(/Expires at/i)).toHaveValue("")
    })
  })
})
