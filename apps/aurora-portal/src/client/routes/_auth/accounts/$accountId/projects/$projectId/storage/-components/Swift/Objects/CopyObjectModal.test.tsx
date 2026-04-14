import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CopyObjectModal } from "./CopyObjectModal"
import type { ObjectRow } from "./"

// ─── Mock virtualizer ─────────────────────────────────────────────────────────
// useVirtualizer doesn't work in jsdom (no layout engine), so we render all
// items directly by mocking getVirtualItems to return every row.

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 32,
        size: 32,
        key: i,
        measureElement: vi.fn(),
      })),
    getTotalSize: () => count * 32,
    measureElement: vi.fn(),
  }),
}))

// ─── Mock TanStack Router ─────────────────────────────────────────────────────

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useParams: vi.fn(() => ({
      accountId: "test-account",
      projectId: "test-project",
      provider: "swift",
      containerName: "source-container",
    })),
  }
})

// ─── Mock tRPC ────────────────────────────────────────────────────────────────

const mockContainers = [
  { name: "source-container", count: 2, bytes: 1024 },
  { name: "backup-container", count: 5, bytes: 2048 },
  { name: "archive-container", count: 0, bytes: 0 },
]

const mockObjects = [
  { name: "docs/", hash: "000", bytes: 0, content_type: "application/directory", last_modified: "2024-01-01" },
  { name: "docs/report.pdf", hash: "abc", bytes: 512, content_type: "application/pdf", last_modified: "2024-01-02" },
  { name: "readme.txt", hash: "def", bytes: 64, content_type: "text/plain", last_modified: "2024-01-03" },
]

let trpcState = {
  containers: mockContainers as typeof mockContainers | undefined,
  isLoadingContainers: false,
  objects: mockObjects as typeof mockObjects | undefined,
  isLoadingObjects: false,
  copyMutate: vi.fn(),
  copyReset: vi.fn(),
  copyIsPending: false,
  copyIsError: false,
  copyError: null as { message: string } | null,
}

const mockInvalidate = vi.fn()

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          listObjects: { invalidate: mockInvalidate },
        },
      },
    }),
    storage: {
      swift: {
        listContainers: {
          useQuery: (_input: unknown, opts: { enabled?: boolean }) =>
            opts?.enabled === false
              ? { data: undefined, isLoading: false }
              : { data: trpcState.containers, isLoading: trpcState.isLoadingContainers },
        },
        listObjects: {
          useQuery: (_input: unknown, opts: { enabled?: boolean }) =>
            opts?.enabled === false
              ? { data: undefined, isLoading: false }
              : { data: trpcState.objects, isLoading: trpcState.isLoadingObjects },
        },
        copyObject: {
          useMutation: (opts: { onSuccess?: () => void; onError?: (e: { message: string }) => void }) => ({
            mutate: (input: unknown) => {
              trpcState.copyMutate(input)
              if (trpcState.copyIsError && trpcState.copyError) {
                opts.onError?.(trpcState.copyError)
              } else {
                opts.onSuccess?.()
              }
            },
            reset: trpcState.copyReset,
            isPending: trpcState.copyIsPending,
            isError: trpcState.copyIsError,
            error: trpcState.copyError,
          }),
        },
      },
    },
  },
}))

// ─── Fixture ──────────────────────────────────────────────────────────────────

const makeObject = (name = "report.pdf", displayName = "report.pdf"): ObjectRow => ({
  kind: "object",
  name,
  displayName,
  bytes: 1024,
  last_modified: "2024-03-01T08:00:00",
  content_type: "application/pdf",
})

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  object = makeObject(),
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  object?: ObjectRow | null
  onClose?: () => void
  onSuccess?: (objectName: string, targetContainer: string, targetPath: string) => void
  onError?: (objectName: string, errorMessage: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CopyObjectModal isOpen={isOpen} object={object} onClose={onClose} onSuccess={onSuccess} onError={onError} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CopyObjectModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    trpcState = {
      containers: mockContainers,
      isLoadingContainers: false,
      objects: mockObjects,
      isLoadingObjects: false,
      copyMutate: vi.fn(),
      copyReset: vi.fn(),
      copyIsPending: false,
      copyIsError: false,
      copyError: null,
    }
    await act(async () => {
      i18n.activate("en")
    })
  })

  // ── Visibility ───────────────────────────────────────────────────────────────

  describe("Visibility", () => {
    test("renders nothing when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    test("renders nothing when object is null", () => {
      renderModal({ object: null })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    test("renders modal when isOpen and object are set", () => {
      renderModal()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    test("displays the source object name in the modal title", () => {
      renderModal({ object: makeObject("docs/report.pdf", "report.pdf") })
      expect(screen.getByText("report.pdf")).toBeInTheDocument()
    })
  })

  // ── Initial state ─────────────────────────────────────────────────────────────

  describe("Initial state", () => {
    test("target container defaults to source container", () => {
      renderModal()
      // Juno ComboBox renders a hidden input + a visible combobox input — both
      // may carry the value, so use getAllByDisplayValue and assert at least one.
      const inputs = screen.getAllByDisplayValue("source-container")
      expect(inputs.length).toBeGreaterThan(0)
    })

    test("target path shows root path with object name by default", () => {
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      expect(screen.getByDisplayValue("/source-container/report.pdf")).toBeInTheDocument()
    })

    test("Copy metadata checkbox is checked by default", () => {
      renderModal()
      const checkbox = screen.getByRole("checkbox")
      expect(checkbox).toBeChecked()
    })

    test("shows Root breadcrumb when at root level", () => {
      renderModal()
      expect(screen.getByText(/Root/i)).toBeInTheDocument()
    })

    test("renders Copy and Cancel buttons", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Copy$/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("renders New Folder button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /New Folder/i })).toBeInTheDocument()
    })
  })

  // ── Unchanged destination guard ───────────────────────────────────────────────

  describe("Unchanged destination guard", () => {
    test("Copy button is disabled when destination is unchanged (same container, same prefix)", () => {
      // Default: root-level object, target = source container, prefix = ""
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      expect(screen.getByRole("button", { name: /^Copy$/i })).toBeDisabled()
    })

    test("Copy button is enabled after navigating into a folder", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      await user.click(screen.getByText("docs"))
      expect(screen.getByRole("button", { name: /^Copy$/i })).not.toBeDisabled()
    })

    test("Copy button is disabled again after navigating back to the initial prefix", async () => {
      const user = userEvent.setup()
      // Object lives at root — navigating in then back returns to initial prefix
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      await user.click(screen.getByText("docs"))
      expect(screen.getByRole("button", { name: /^Copy$/i })).not.toBeDisabled()
      await user.click(screen.getByRole("button", { name: /Back/i }))
      expect(screen.getByRole("button", { name: /^Copy$/i })).toBeDisabled()
    })

    test("Copy button is enabled when object lives in a subfolder and destination is root", () => {
      // Object lives at "docs/report.pdf" → initialPrefix = "docs/"
      // Default state has currentPrefix = "" (root) which differs from "docs/"
      renderModal({ object: makeObject("docs/report.pdf", "report.pdf") })
      expect(screen.getByRole("button", { name: /^Copy$/i })).not.toBeDisabled()
    })

    test("Copy button is disabled when navigated to the object's own folder", async () => {
      const user = userEvent.setup()
      // Object lives in "docs/" — navigating into docs/ matches the initial prefix
      renderModal({ object: makeObject("docs/report.pdf", "report.pdf") })
      await user.click(screen.getByText("docs"))
      expect(screen.getByRole("button", { name: /^Copy$/i })).toBeDisabled()
    })
  })

  // ── Folder browser ────────────────────────────────────────────────────────────

  describe("Folder browser", () => {
    test("shows folders from object listing", () => {
      renderModal()
      // buildRows collapses docs/ into a folder row
      expect(screen.getByText("docs")).toBeInTheDocument()
    })

    test("shows files as non-clickable items", () => {
      renderModal()
      expect(screen.getByText("readme.txt")).toBeInTheDocument()
    })

    test("navigates into a folder when clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByText("docs"))
      // Back button appears after navigation
      expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument()
    })

    test("updates target path when navigating into folder", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      await user.click(screen.getByText("docs"))
      expect(screen.getByDisplayValue("/source-container/docs/report.pdf")).toBeInTheDocument()
    })

    test("navigates back to root when Back is clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByText("docs"))
      expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Back/i }))
      expect(screen.getByText(/Root/i)).toBeInTheDocument()
    })

    test("shows current prefix in breadcrumb after navigating", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByText("docs"))
      expect(screen.getByText(/docs\//)).toBeInTheDocument()
    })

    test("shows loading spinner when objects are loading", () => {
      trpcState.isLoadingObjects = true
      renderModal()
      // Loading spinner is shown in the folder browser area
      expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument()
    })

    test("shows empty state message when folder has no contents", () => {
      trpcState.objects = []
      renderModal()
      expect(screen.getByText(/This folder is empty/i)).toBeInTheDocument()
    })
  })

  // ── New folder ────────────────────────────────────────────────────────────────

  describe("New folder", () => {
    test("shows new folder input when New Folder is clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      expect(screen.getByPlaceholderText(/new-folder-name/i)).toBeInTheDocument()
    })

    test("Create button is disabled when folder name is empty", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      expect(screen.getByRole("button", { name: /^Create$/i })).toBeDisabled()
    })

    test("hides new folder input when Cancel is clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      expect(screen.getByPlaceholderText(/new-folder-name/i)).toBeInTheDocument()
      // There are two Cancel buttons — use the one inside the new folder form
      const cancelButtons = screen.getAllByRole("button", { name: /Cancel/i })
      await user.click(cancelButtons[cancelButtons.length - 1])
      expect(screen.queryByPlaceholderText(/new-folder-name/i)).not.toBeInTheDocument()
    })

    test("creates folder and navigates into it", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      await user.type(screen.getByPlaceholderText(/new-folder-name/i), "my-new-folder")
      await user.click(screen.getByRole("button", { name: /^Create$/i }))
      // Should navigate into the new folder — breadcrumb shows its path
      expect(screen.getByText(/my-new-folder\//)).toBeInTheDocument()
    })

    test("shows error when folder name is empty on create", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      // Manually trigger create with empty name by directly submitting (button is disabled, so use keyboard)
      const input = screen.getByPlaceholderText(/new-folder-name/i)
      await user.type(input, " ")
      await user.keyboard("{Enter}")
      expect(screen.getByText(/Folder name is required/i)).toBeInTheDocument()
    })

    test("shows error when folder name contains slashes", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      await user.type(screen.getByPlaceholderText(/new-folder-name/i), "foo/bar")
      await user.click(screen.getByRole("button", { name: /^Create$/i }))
      expect(screen.getByText(/cannot contain slashes/i)).toBeInTheDocument()
    })

    test("shows error when folder name has leading whitespace", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      const input = screen.getByPlaceholderText(/new-folder-name/i)
      // Use clipboard paste to insert value with leading space
      await user.click(input)
      await user.paste(" leading")
      await user.click(screen.getByRole("button", { name: /^Create$/i }))
      expect(screen.getByText(/cannot have leading or trailing whitespace/i)).toBeInTheDocument()
    })

    test("creates folder from keyboard Enter key", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      await user.type(screen.getByPlaceholderText(/new-folder-name/i), "keyboard-folder{Enter}")
      expect(screen.getByText(/keyboard-folder\//)).toBeInTheDocument()
    })

    test("dismisses new folder input with Escape key", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      await user.type(screen.getByPlaceholderText(/new-folder-name/i), "test{Escape}")
      expect(screen.queryByPlaceholderText(/new-folder-name/i)).not.toBeInTheDocument()
    })
  })

  // ── Copy action ───────────────────────────────────────────────────────────────

  describe("Copy action", () => {
    test("calls copyObject mutation with correct params on confirm", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      // Navigate into a folder to enable the button (destination must differ from source)
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(trpcState.copyMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          container: "source-container",
          object: "report.pdf",
          destination: "/source-container/docs/report.pdf",
        })
      )
    })

    test("includes freshMetadata: false when Copy metadata is checked", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(trpcState.copyMutate).toHaveBeenCalledWith(expect.objectContaining({ freshMetadata: false }))
    })

    test("includes freshMetadata: true when Copy metadata is unchecked", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("checkbox"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(trpcState.copyMutate).toHaveBeenCalledWith(expect.objectContaining({ freshMetadata: true }))
    })

    test("calls onSuccess with correct arguments after copy", async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      renderModal({ object: makeObject("report.pdf", "report.pdf"), onSuccess })
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(onSuccess).toHaveBeenCalledWith("report.pdf", "source-container", "docs/")
    })

    test("calls onClose after successful copy", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("calls onError with correct arguments when copy fails", async () => {
      trpcState.copyIsError = true
      trpcState.copyError = { message: "Forbidden" }
      const user = userEvent.setup()
      const onError = vi.fn()
      renderModal({ object: makeObject("report.pdf", "report.pdf"), onError })
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(onError).toHaveBeenCalledWith("report.pdf", "Forbidden")
    })

    test("does not call onClose after failed copy", async () => {
      trpcState.copyIsError = true
      trpcState.copyError = { message: "Forbidden" }
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(onClose).not.toHaveBeenCalled()
    })

    test("includes current prefix in destination when navigated into folder", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(trpcState.copyMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: "/source-container/docs/report.pdf",
        })
      )
    })

    test("Copy button is disabled while copy is pending", () => {
      trpcState.copyIsPending = true
      renderModal()
      expect(screen.getByRole("button", { name: /Copying\.\.\./i })).toBeDisabled()
    })

    test("shows Copying... label on confirm button while pending", () => {
      trpcState.copyIsPending = true
      renderModal()
      expect(screen.getByText(/Copying\.\.\./i)).toBeInTheDocument()
    })

    test("shows spinner when copy is pending", () => {
      trpcState.copyIsPending = true
      renderModal()
      // Pending state renders a spinner + text instead of the form
      expect(screen.getByText(/Copying object\.\.\./i)).toBeInTheDocument()
    })
  })

  // ── Cancel ────────────────────────────────────────────────────────────────────

  describe("Cancel", () => {
    test("calls onClose when Cancel is clicked", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("calls copyReset when modal is cancelled", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(trpcState.copyReset).toHaveBeenCalled()
    })
  })

  // ── Container loading state ───────────────────────────────────────────────────

  describe("Container loading state", () => {
    test("Copy button is disabled while containers are loading", () => {
      trpcState.isLoadingContainers = true
      renderModal()
      expect(screen.getByRole("button", { name: /^Copy$/i })).toBeDisabled()
    })
  })

  // ── State reset ───────────────────────────────────────────────────────────────

  describe("State reset", () => {
    test("resets target container to source container when modal closes and reopens", async () => {
      const { rerender } = renderModal({ isOpen: true })
      // Close
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <CopyObjectModal isOpen={false} object={makeObject()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      // Reopen
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <CopyObjectModal isOpen={true} object={makeObject()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      expect(screen.getAllByDisplayValue("source-container").length).toBeGreaterThan(0)
    })

    test("resets prefix to root when modal reopens", async () => {
      const user = userEvent.setup()
      const { rerender } = renderModal({ isOpen: true })
      await user.click(screen.getByText("docs"))
      // Close and reopen
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <CopyObjectModal isOpen={false} object={makeObject()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <CopyObjectModal isOpen={true} object={makeObject()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      expect(screen.getByText(/Root/i)).toBeInTheDocument()
    })
  })

  // ── invalidate ────────────────────────────────────────────────────────────────

  describe("Cache invalidation", () => {
    test("invalidates listObjects cache on successful copy", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(mockInvalidate).toHaveBeenCalled()
    })

    test("does not invalidate cache on copy error", async () => {
      trpcState.copyIsError = true
      trpcState.copyError = { message: "Forbidden" }
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Copy$/i }))
      expect(mockInvalidate).not.toHaveBeenCalled()
    })
  })
})
