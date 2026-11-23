import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ScheduleObjectDeletionModal } from "./ScheduleObjectDeletionModal"
import type { ObjectMetadata } from "@/server/Storage/types/swift"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── DateTimePicker mock ──────────────────────────────────────────────────────
// Flatpickr does not initialise correctly in JSDOM; replace with a plain
// controlled input so tests can fire change events directly.

vi.mock("@cloudoperators/juno-ui-components", async () => {
  const actual = await vi.importActual<typeof import("@cloudoperators/juno-ui-components")>(
    "@cloudoperators/juno-ui-components"
  )
  return {
    ...actual,
    DateTimePicker: ({
      value,
      onChange,
      onClear,
      label,
      disabled,
    }: {
      value?: string | number | Date
      onChange?: (dates: Date[], dateStr: string) => void
      onClear?: (dates: Date[], dateStr: string) => void
      label?: string
      disabled?: boolean
      [key: string]: unknown
    }) => {
      const strValue = typeof value === "string" ? value : value instanceof Date ? value.toISOString() : ""
      return (
        <input
          aria-label={typeof label === "string" ? label : undefined}
          value={strValue}
          disabled={disabled}
          onChange={(e) => {
            const val = e.target.value
            const d = val ? new Date(val) : null
            if (d && !isNaN(d.getTime())) {
              onChange?.([d], val)
            } else {
              onClear?.([], "")
            }
          }}
        />
      )
    },
  }
})

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

const makeObjectRow = (overrides: Partial<{ name: string; displayName: string }> = {}) => ({
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

const getModalSaveButton = () => screen.getByRole("button", { name: /^Save$/i })

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
        <ScheduleObjectDeletionModal
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

describe("ScheduleObjectDeletionModal", () => {
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
    expect(screen.queryByText(/Schedule Deletion/i)).not.toBeInTheDocument()

    renderModal({ isOpen: true, object: null })
    expect(screen.queryByText(/Schedule Deletion/i)).not.toBeInTheDocument()
  })

  test("renders modal with object name when open", async () => {
    mockObjectMetadata = makeObjectMetadata()
    renderModal()
    await flushEffects()
    expect(screen.getByText(/Schedule Deletion/i)).toBeInTheDocument()
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

  // ── Expiry loading ─────────────────────────────────────────────────────────

  test("pre-fills DateTimePicker with existing deleteAt", async () => {
    const deleteAt = Math.floor(new Date("2027-03-15T10:00:00.000Z").getTime() / 1000)
    mockObjectMetadata = makeObjectMetadata({ deleteAt })
    renderModal()
    await flushEffects()
    const input = screen.getByLabelText(/Expires at/i)
    expect(input).toHaveValue("2027-03-15T10:00:00.000Z")
  })

  test("shows empty DateTimePicker when no deleteAt set", async () => {
    mockObjectMetadata = makeObjectMetadata()
    renderModal()
    await flushEffects()
    const input = screen.getByLabelText(/Expires at/i)
    expect(input).toHaveValue("")
  })

  // ── Save button disabled until changed ─────────────────────────────────────

  test("Save is disabled when nothing has changed", async () => {
    mockObjectMetadata = makeObjectMetadata()
    renderModal()
    await flushEffects()
    expect(getModalSaveButton()).toBeDisabled()
  })

  test("Save becomes enabled after changing the date", async () => {
    mockObjectMetadata = makeObjectMetadata()
    renderModal()
    await flushEffects()
    fireEvent.change(screen.getByLabelText(/Expires at/i), {
      target: { value: "2027-06-01T12:00:00.000Z" },
    })
    expect(getModalSaveButton()).not.toBeDisabled()
  })

  // ── Submission ─────────────────────────────────────────────────────────────

  test("submits deleteAt (unix seconds) when date is set", async () => {
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    fireEvent.change(screen.getByLabelText(/Expires at/i), {
      target: { value: "2027-06-01T12:00:00.000Z" },
    })
    await user.click(getModalSaveButton())
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: mockProjectId,
        container: "test-container",
        object: "sample.txt",
        deleteAt: Math.floor(new Date("2027-06-01T12:00:00.000Z").getTime() / 1000),
      })
    )
    expect(mockMutate).toHaveBeenCalledWith(expect.not.objectContaining({ removeDeleteAt: expect.anything() }))
  })

  test("submits removeDeleteAt when date is cleared", async () => {
    const deleteAt = Math.floor(new Date("2027-03-15T10:00:00.000Z").getTime() / 1000)
    mockObjectMetadata = makeObjectMetadata({ deleteAt })
    const user = userEvent.setup()
    renderModal()
    await flushEffects()
    // Clear by setting empty value (triggers onClear in mock)
    fireEvent.change(screen.getByLabelText(/Expires at/i), {
      target: { value: "" },
    })
    await user.click(getModalSaveButton())
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: mockProjectId,
        container: "test-container",
        object: "sample.txt",
        removeDeleteAt: true,
      })
    )
    expect(mockMutate).toHaveBeenCalledWith(expect.not.objectContaining({ deleteAt: expect.anything() }))
  })

  // ── Success / error callbacks ───────────────────────────────────────────────

  test("calls onSuccess and invalidates cache after successful mutation", async () => {
    const onSuccess = vi.fn()
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal({ onSuccess })
    await flushEffects()
    fireEvent.change(screen.getByLabelText(/Expires at/i), {
      target: { value: "2027-06-01T12:00:00.000Z" },
    })
    await user.click(getModalSaveButton())
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("sample.txt")
      expect(mockInvalidateObjectMetadata).toHaveBeenCalled()
      expect(mockInvalidateListObjects).toHaveBeenCalled()
    })
  })

  test("reports a mutation failure via onError and closes the modal", async () => {
    mutationError = "Forbidden"
    const onError = vi.fn()
    const onClose = vi.fn()
    mockObjectMetadata = makeObjectMetadata()
    const user = userEvent.setup()
    renderModal({ onError, onClose })
    await flushEffects()
    fireEvent.change(screen.getByLabelText(/Expires at/i), {
      target: { value: "2027-06-01T12:00:00.000Z" },
    })
    await user.click(getModalSaveButton())
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("sample.txt", "Forbidden")
    })
    expect(onClose).toHaveBeenCalled()
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
})
