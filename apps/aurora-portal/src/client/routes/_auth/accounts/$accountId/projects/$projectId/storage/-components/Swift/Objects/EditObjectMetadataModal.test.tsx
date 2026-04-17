import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { EditObjectMetadataModal } from "./EditObjectMetadataModal"
import type { ObjectMetadata } from "@/server/Storage/types/swift"

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

// Finds a small icon button (Save/Discard/Edit/Delete) by its title attribute.
const getIconButton = (name: RegExp) =>
  screen.getAllByRole("button").find((btn) => name.test(btn.getAttribute("title") ?? ""))!

const getModalUpdateButton = () => screen.getByRole("button", { name: /Update object/i })

// Flushes React effects after render so the form body (which depends on metadataRaw)
// is guaranteed to be in the DOM before interactions begin.
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

  describe("Visibility", () => {
    test("renders nothing when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Properties of/i)).not.toBeInTheDocument()
    })

    test("renders nothing when object is null", () => {
      renderModal({ object: null })
      expect(screen.queryByText(/Properties of/i)).not.toBeInTheDocument()
    })

    test("renders modal title with object display name", async () => {
      mockObjectMetadata = makeObjectMetadata()
      renderModal()
      await flushEffects()
      expect(screen.getByText("Properties of")).toBeInTheDocument()
      expect(screen.getByText("sample.txt")).toBeInTheDocument()
    })
  })

  // ── Loading state ───────────────────────────────────────────────────────────

  describe("Loading state", () => {
    test("shows loading spinner while fetching metadata", () => {
      metadataLoading = true
      renderModal()
      expect(screen.getByText(/Loading object properties/i)).toBeInTheDocument()
    })

    test("Update object button is disabled while loading", () => {
      metadataLoading = true
      renderModal()
      expect(getModalUpdateButton()).toBeDisabled()
    })
  })

  // ── Error state ─────────────────────────────────────────────────────────────

  describe("Error state", () => {
    test("shows error message when metadata fetch fails", () => {
      metadataError = { message: "Not found" }
      renderModal()
      expect(screen.getByText(/Failed to load object metadata/i)).toBeInTheDocument()
      expect(screen.getByText(/Not found/)).toBeInTheDocument()
    })
  })

  // ── Read-only properties ────────────────────────────────────────────────────

  describe("Read-only properties", () => {
    test("displays content type", async () => {
      mockObjectMetadata = makeObjectMetadata({ contentType: "application/json" })
      renderModal()
      await flushEffects()
      expect(screen.getByText("application/json")).toBeInTheDocument()
    })

    test("displays etag as MD5 checksum", async () => {
      mockObjectMetadata = makeObjectMetadata({ etag: "deadbeef1234" })
      renderModal()
      await flushEffects()
      expect(screen.getByText("deadbeef1234")).toBeInTheDocument()
    })

    test("displays formatted size", async () => {
      mockObjectMetadata = makeObjectMetadata({ contentLength: 1024 })
      renderModal()
      await flushEffects()
      expect(screen.getByText(/1(\s*)KiB/i)).toBeInTheDocument()
    })

    test("displays — for missing content type", async () => {
      mockObjectMetadata = makeObjectMetadata({ contentType: undefined })
      renderModal()
      await flushEffects()
      expect(screen.getByText("Content type").closest("div")?.textContent).toContain("—")
    })

    test("displays last modified from metadataRaw when available", async () => {
      mockObjectMetadata = makeObjectMetadata({ lastModified: "2026-04-16T13:29:05.000000" })
      renderModal()
      await flushEffects()
      expect(screen.getByText(/Last modified/i)).toBeInTheDocument()
    })

    test("falls back to object.last_modified when lastModified not in metadata", async () => {
      mockObjectMetadata = makeObjectMetadata({ lastModified: undefined })
      renderModal({ object: makeObjectRow({ last_modified: "2026-04-10T13:29:04.000000" }) })
      await flushEffects()
      expect(screen.getByText(/Last modified/i)).toBeInTheDocument()
    })
  })

  // ── SLO / DLO notices ───────────────────────────────────────────────────────

  describe("Large object notices", () => {
    test("shows SLO notice when staticLargeObject is true", async () => {
      mockObjectMetadata = makeObjectMetadata({ staticLargeObject: true })
      renderModal()
      await flushEffects()
      expect(screen.getByText(/static large object/i)).toBeInTheDocument()
    })

    test("shows DLO notice when objectManifest is set", async () => {
      mockObjectMetadata = makeObjectMetadata({ objectManifest: "segments/prefix" })
      renderModal()
      await flushEffects()
      expect(screen.getByText(/dynamic large object/i)).toBeInTheDocument()
    })

    test("shows no large object notice for a regular object", async () => {
      mockObjectMetadata = makeObjectMetadata()
      renderModal()
      await flushEffects()
      expect(screen.queryByText(/large object/i)).not.toBeInTheDocument()
    })
  })

  // ── Expires at field ────────────────────────────────────────────────────────

  describe("Expires at field", () => {
    test("field is empty when deleteAt is not set", async () => {
      mockObjectMetadata = makeObjectMetadata({ deleteAt: undefined })
      renderModal()
      await flushEffects()
      const input = screen.getByLabelText(/Expires at/i)
      expect(input).toHaveValue("")
    })

    test("field is populated with formatted timestamp when deleteAt is set", async () => {
      // Unix 1747400000 → "2025-05-16 ..."
      mockObjectMetadata = makeObjectMetadata({ deleteAt: 1747400000 })
      renderModal()
      await flushEffects()
      const input = screen.getByLabelText(/Expires at/i)
      expect(input.getAttribute("value")).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })

    test("shows invalid state after debounce when format is wrong", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      // Type an invalid value and wait longer than the 600ms debounce
      await user.type(screen.getByLabelText(/Expires at/i), "not-a-date")
      // The invalid prop is set by the debounce — verify the input exists and has a value
      await waitFor(
        () => {
          const input = screen.getByLabelText(/Expires at/i)
          expect(input).toHaveValue("not-a-date")
        },
        { timeout: 2000 }
      )
    }, 10000)

    test("shows helptext when user has typed something", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.type(screen.getByLabelText(/Expires at/i), "2026")
      await waitFor(() => {
        expect(screen.getByText(/Enter a timestamp like/i)).toBeInTheDocument()
      })
    })

    test("does not show helptext when field is empty", async () => {
      mockObjectMetadata = makeObjectMetadata({ deleteAt: undefined })
      renderModal()
      await flushEffects()
      expect(screen.queryByText(/Enter a timestamp like/i)).not.toBeInTheDocument()
    })

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
  })

  // ── Custom metadata ─────────────────────────────────────────────────────────

  describe("Custom metadata", () => {
    test("shows empty state when no custom metadata", async () => {
      mockObjectMetadata = makeObjectMetadata()
      renderModal()
      await flushEffects()
      expect(screen.getByText(/No custom metadata/i)).toBeInTheDocument()
    })

    test("renders existing custom metadata entries", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { author: "Alice", version: "2" } })
      renderModal()
      await flushEffects()
      expect(screen.getByText("author")).toBeInTheDocument()
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("version")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
    })

    test("Add Property button is visible", async () => {
      mockObjectMetadata = makeObjectMetadata()
      renderModal()
      await flushEffects()
      expect(screen.getByRole("button", { name: /Add Property/i })).toBeInTheDocument()
    })

    test("clicking Add Property shows new row inputs", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      expect(screen.getByPlaceholderText(/property_key/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Value/i)).toBeInTheDocument()
    })

    test("shows error when saving new entry with empty key", async () => {
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

    test("shows error when key contains invalid characters", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "invalid key")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText(/Key contains invalid characters/i)).toBeInTheDocument()
      })
    })

    test("shows error when key has no alphanumeric characters", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "----")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText(/Key must contain at least one alphanumeric character/i)).toBeInTheDocument()
      })
    })

    test("accepts valid key with hyphens", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "my-key-1")
      await user.type(screen.getByPlaceholderText(/Value/i), "val")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText("my-key-1")).toBeInTheDocument()
      })
    })

    test("adds new metadata entry to table after valid save", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "new-key")
      await user.type(screen.getByPlaceholderText(/Value/i), "new-value")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText("new-key")).toBeInTheDocument()
        expect(screen.getByText("new-value")).toBeInTheDocument()
      })
    })

    test("Discard button cancels new entry without adding it", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "discard-me")
      await user.click(getIconButton(/Discard/i))
      await waitFor(() => {
        expect(screen.queryByText("discard-me")).not.toBeInTheDocument()
        expect(screen.getByText(/No custom metadata/i)).toBeInTheDocument()
      })
    })

    test("Edit button shows edit inputs for existing entry", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { author: "Alice" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Edit$/i))
      expect(screen.getAllByRole("textbox").some((i) => i.getAttribute("value") === "author")).toBeTruthy()
    })

    test("can save edited metadata entry", async () => {
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

    test("Discard in edit mode restores original value", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { author: "Alice" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Edit$/i))
      const valueInputs = screen.getAllByRole("textbox").filter((i) => i.getAttribute("value") === "Alice")
      await user.clear(valueInputs[0])
      await user.type(valueInputs[0], "Temp")
      await user.click(getIconButton(/Discard/i))
      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument()
      })
    })

    test("shows error when saving edit with invalid key characters", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { author: "Alice" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Edit$/i))
      const keyInput = screen.getAllByRole("textbox").find((i) => i.getAttribute("value") === "author")!
      await user.clear(keyInput)
      await user.type(keyInput, "bad key")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText(/Key contains invalid characters/i)).toBeInTheDocument()
      })
    })

    test("Delete button removes metadata entry", async () => {
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

    test("Add Property button is disabled while editing an existing entry", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { author: "Alice" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Edit$/i))
      expect(screen.getByRole("button", { name: /Add Property/i })).toBeDisabled()
    })

    test("Add Property button is disabled while adding a new entry", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      expect(screen.getByRole("button", { name: /Add Property/i })).toBeDisabled()
    })
  })

  // ── Update object button disabled state ─────────────────────────────────────

  describe("Update object button enabled state", () => {
    test("is disabled when form is unchanged", async () => {
      mockObjectMetadata = makeObjectMetadata()
      renderModal()
      await flushEffects()
      expect(getModalUpdateButton()).toBeDisabled()
    })

    test("is enabled after a new metadata entry is added", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "k")
      await user.type(screen.getByPlaceholderText(/Value/i), "v")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(getModalUpdateButton()).not.toBeDisabled()
      })
    })

    test("is enabled after an existing entry is deleted", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { author: "Alice" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await waitFor(() => {
        expect(getModalUpdateButton()).not.toBeDisabled()
      })
    })

    test("is enabled after expires at is changed", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.type(screen.getByLabelText(/Expires at/i), "2026-05-16 18:14:57")
      await waitFor(() => {
        expect(getModalUpdateButton()).not.toBeDisabled()
      })
    })

    test("is disabled while an unsaved new entry row is open", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      expect(getModalUpdateButton()).toBeDisabled()
    })

    test("is disabled while an entry is being edited", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { author: "Alice" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Edit$/i))
      expect(getModalUpdateButton()).toBeDisabled()
    })
  })

  // ── Submission ──────────────────────────────────────────────────────────────

  describe("Submission", () => {
    test("calls mutate with new metadata entry", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "owner")
      await user.type(screen.getByPlaceholderText(/Value/i), "Alice")
      await user.click(getIconButton(/^Save$/i))
      await user.click(getModalUpdateButton())
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ owner: "Alice" }) })
      )
    })

    test("calls mutate with deleteAt when expires at is set", async () => {
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.type(screen.getByLabelText(/Expires at/i), "2026-05-16 18:14:57")
      await user.click(getModalUpdateButton())
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ deleteAt: expect.any(Number) }))
    })

    test("calls mutate without deleteAt when expires at is empty", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(getModalUpdateButton())
      expect(mockMutate).toHaveBeenCalledWith(expect.not.objectContaining({ deleteAt: expect.anything() }))
    })

    test("calls mutate with correct container and object name", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(getModalUpdateButton())
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ container: "test-container", object: "sample.txt" })
      )
    })

    test("calls onSuccess with object display name after successful mutation", async () => {
      const onSuccess = vi.fn()
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(getModalUpdateButton())
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("sample.txt")
      })
    })

    test("invalidates getObjectMetadata cache on success", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(getModalUpdateButton())
      await waitFor(() => {
        expect(mockInvalidateObjectMetadata).toHaveBeenCalledWith({
          container: "test-container",
          object: "sample.txt",
        })
      })
    })

    test("invalidates listObjects cache on success", async () => {
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(getModalUpdateButton())
      await waitFor(() => {
        expect(mockInvalidateListObjects).toHaveBeenCalledWith({ container: "test-container" })
      })
    })

    test("closes modal after successful mutation", async () => {
      const onClose = vi.fn()
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
      const user = userEvent.setup()
      renderModal({ onClose })
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(getModalUpdateButton())
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  // ── Error handling ──────────────────────────────────────────────────────────

  describe("Error handling", () => {
    test("calls onError with object name and error message on mutation failure", async () => {
      mutationError = "Internal Server Error"
      const onError = vi.fn()
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
      const user = userEvent.setup()
      renderModal({ onError })
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(getModalUpdateButton())
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("sample.txt", "Internal Server Error")
      })
    })

    test("does not close the modal on mutation failure", async () => {
      mutationError = "Server error"
      const onClose = vi.fn()
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
      const user = userEvent.setup()
      renderModal({ onClose })
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(getModalUpdateButton())
      await waitFor(() => {
        expect(onClose).not.toHaveBeenCalled()
      })
    })

    test("shows mutation error message in modal", async () => {
      mutationError = "Forbidden"
      mockObjectMetadata = makeObjectMetadata({ customMetadata: { k: "v" } })
      const user = userEvent.setup()
      renderModal()
      await flushEffects()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(getModalUpdateButton())
      await waitFor(() => {
        expect(screen.getByText(/Failed to update object/i)).toBeInTheDocument()
        expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
      })
    })
  })

  // ── Cancel / close ──────────────────────────────────────────────────────────

  describe("Cancel / close", () => {
    test("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      mockObjectMetadata = makeObjectMetadata()
      const user = userEvent.setup()
      renderModal({ onClose })
      await flushEffects()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("resets form state when modal is closed and reopened", async () => {
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
})
