import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { MoveRenameObjectModal } from "./MoveRenameObjectModal"
import type { ObjectRow } from "./"

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
  deleteMutate: vi.fn(),
  deleteReset: vi.fn(),
  deleteIsPending: false,
  deleteIsError: false,
  deleteError: null as { message: string } | null,
}

const mockInvalidate = vi.fn()

// Capture mutation option callbacks so tests can trigger them manually
let capturedCopyOpts: {
  onSuccess?: () => void
  onError?: (e: { message: string }) => void
} = {}
let capturedDeleteOpts: {
  onSuccess?: () => void
  onError?: (e: { message: string }) => void
  onSettled?: () => void
} = {}

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
          useMutation: (opts: { onSuccess?: () => void; onError?: (e: { message: string }) => void }) => {
            capturedCopyOpts = opts
            return {
              mutate: (input: unknown) => {
                trpcState.copyMutate(input)
              },
              reset: trpcState.copyReset,
              isPending: trpcState.copyIsPending,
              isError: trpcState.copyIsError,
              error: trpcState.copyError,
            }
          },
        },
        deleteObject: {
          useMutation: (opts: {
            onSuccess?: () => void
            onError?: (e: { message: string }) => void
            onSettled?: () => void
          }) => {
            capturedDeleteOpts = opts
            return {
              mutate: (input: unknown) => {
                trpcState.deleteMutate(input)
              },
              reset: trpcState.deleteReset,
              isPending: trpcState.deleteIsPending,
              isError: trpcState.deleteIsError,
              error: trpcState.deleteError,
            }
          },
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
        <MoveRenameObjectModal
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

describe("MoveRenameObjectModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedCopyOpts = {}
    capturedDeleteOpts = {}
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
      deleteMutate: vi.fn(),
      deleteReset: vi.fn(),
      deleteIsPending: false,
      deleteIsError: false,
      deleteError: null,
    }
    await act(async () => {
      i18n.activate("en")
    })
  })

  // ── Visibility ────────────────────────────────────────────────────────────

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

  // ── Initial state ─────────────────────────────────────────────────────────

  describe("Initial state", () => {
    test("new object name field is pre-filled with source displayName", () => {
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      expect(screen.getByDisplayValue("report.pdf")).toBeInTheDocument()
    })

    test("target container defaults to source container", () => {
      renderModal()
      const inputs = screen.getAllByDisplayValue("source-container")
      expect(inputs.length).toBeGreaterThan(0)
    })

    test("target path shows root path with object name by default", () => {
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      expect(screen.getByDisplayValue("/source-container/report.pdf")).toBeInTheDocument()
    })

    test("shows Root breadcrumb when at root level", () => {
      renderModal()
      expect(screen.getByText(/Root/i)).toBeInTheDocument()
    })

    test("renders Move and Cancel buttons", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Move$/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("renders New Folder button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /New Folder/i })).toBeInTheDocument()
    })

    test("does not have a Copy metadata checkbox", () => {
      renderModal()
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    })
  })

  // ── Object name field ─────────────────────────────────────────────────────

  describe("Object name field", () => {
    test("updates target path when object name is changed", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      const nameInput = screen.getByDisplayValue("report.pdf")
      await user.clear(nameInput)
      await user.type(nameInput, "renamed.pdf")
      expect(screen.getByDisplayValue("/source-container/renamed.pdf")).toBeInTheDocument()
    })

    test("shows error when name is cleared and Move is clicked", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      const nameInput = screen.getByDisplayValue("report.pdf")
      await user.clear(nameInput)
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      expect(screen.getByText(/Object name is required/i)).toBeInTheDocument()
    })

    test("shows error when name contains slashes", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      const nameInput = screen.getByDisplayValue("report.pdf")
      await user.clear(nameInput)
      await user.type(nameInput, "folder/file.pdf")
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      expect(screen.getByText(/cannot contain slashes/i)).toBeInTheDocument()
    })

    test("clears name error when user starts typing", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      const nameInput = screen.getByDisplayValue("report.pdf")
      await user.clear(nameInput)
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      expect(screen.getByText(/Object name is required/i)).toBeInTheDocument()
      await user.type(nameInput, "a")
      expect(screen.queryByText(/Object name is required/i)).not.toBeInTheDocument()
    })
  })

  // ── Folder browser ────────────────────────────────────────────────────────

  describe("Folder browser", () => {
    test("shows folders from object listing", () => {
      renderModal()
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
      await user.click(screen.getByRole("button", { name: /Back/i }))
      expect(screen.getByText(/Root/i)).toBeInTheDocument()
    })

    test("shows loading spinner when objects are loading", () => {
      trpcState.isLoadingObjects = true
      renderModal()
      expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument()
    })

    test("shows empty state when folder has no contents", () => {
      trpcState.objects = []
      renderModal()
      expect(screen.getByText(/This folder is empty/i)).toBeInTheDocument()
    })
  })

  // ── New folder ────────────────────────────────────────────────────────────

  describe("New folder", () => {
    test("shows new folder input when New Folder is clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      expect(screen.getByPlaceholderText(/new-folder-name/i)).toBeInTheDocument()
    })

    test("creates folder and navigates into it", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      await user.type(screen.getByPlaceholderText(/new-folder-name/i), "archive")
      await user.click(screen.getByRole("button", { name: /^Create$/i }))
      expect(screen.getByText(/archive\//)).toBeInTheDocument()
    })

    test("shows error when folder name contains slashes", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      await user.type(screen.getByPlaceholderText(/new-folder-name/i), "foo/bar")
      await user.click(screen.getByRole("button", { name: /^Create$/i }))
      expect(screen.getByText(/cannot contain slashes/i)).toBeInTheDocument()
    })

    test("creates folder from keyboard Enter", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      await user.type(screen.getByPlaceholderText(/new-folder-name/i), "archive{Enter}")
      expect(screen.getByText(/archive\//)).toBeInTheDocument()
    })

    test("dismisses folder input with Escape", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /New Folder/i }))
      await user.type(screen.getByPlaceholderText(/new-folder-name/i), "x{Escape}")
      expect(screen.queryByPlaceholderText(/new-folder-name/i)).not.toBeInTheDocument()
    })
  })

  // ── Move action ───────────────────────────────────────────────────────────

  describe("Move action", () => {
    test("calls copyObject mutation with correct params on confirm", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      expect(trpcState.copyMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          container: "source-container",
          object: "report.pdf",
          destination: "/source-container/report.pdf",
          freshMetadata: false,
        })
      )
    })

    test("uses renamed object name in destination when name is changed", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      const nameInput = screen.getByDisplayValue("report.pdf")
      await user.clear(nameInput)
      await user.type(nameInput, "renamed.pdf")
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      expect(trpcState.copyMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: "/source-container/renamed.pdf",
        })
      )
    })

    test("calls deleteObject after copy succeeds", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      // Simulate copy succeeding
      act(() => {
        capturedCopyOpts.onSuccess?.()
      })
      expect(trpcState.deleteMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          container: "source-container",
          object: "report.pdf",
        })
      )
    })

    test("calls onSuccess after copy + delete succeed", async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      renderModal({ object: makeObject("report.pdf", "report.pdf"), onSuccess })
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      act(() => {
        capturedCopyOpts.onSuccess?.()
      })
      act(() => {
        capturedDeleteOpts.onSuccess?.()
      })
      expect(onSuccess).toHaveBeenCalledWith("report.pdf", "source-container", "")
    })

    test("calls onSuccess with renamed name when object is renamed", async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      renderModal({ object: makeObject("report.pdf", "report.pdf"), onSuccess })
      const nameInput = screen.getByDisplayValue("report.pdf")
      await user.clear(nameInput)
      await user.type(nameInput, "renamed.pdf")
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      act(() => {
        capturedCopyOpts.onSuccess?.()
      })
      act(() => {
        capturedDeleteOpts.onSuccess?.()
      })
      expect(onSuccess).toHaveBeenCalledWith("renamed.pdf", "source-container", "")
    })

    test("invalidates listObjects cache after delete succeeds", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      act(() => {
        capturedCopyOpts.onSuccess?.()
      })
      act(() => {
        capturedDeleteOpts.onSuccess?.()
      })
      expect(mockInvalidate).toHaveBeenCalled()
    })

    test("calls onError and does not call deleteObject when copy fails", async () => {
      const user = userEvent.setup()
      const onError = vi.fn()
      renderModal({ object: makeObject("report.pdf", "report.pdf"), onError })
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      act(() => {
        capturedCopyOpts.onError?.({ message: "Forbidden" })
      })
      expect(trpcState.deleteMutate).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith("report.pdf", "Forbidden")
    })

    test("calls onError when delete fails after copy succeeds", async () => {
      const user = userEvent.setup()
      const onError = vi.fn()
      renderModal({ object: makeObject("report.pdf", "report.pdf"), onError })
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      act(() => {
        capturedCopyOpts.onSuccess?.()
      })
      act(() => {
        capturedDeleteOpts.onError?.({ message: "Delete failed" })
      })
      expect(onError).toHaveBeenCalledWith("report.pdf", "Delete failed")
    })

    test("calls onClose after move settles", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      act(() => {
        capturedCopyOpts.onSuccess?.()
      })
      act(() => {
        capturedDeleteOpts.onSettled?.()
      })
      expect(onClose).toHaveBeenCalled()
    })

    test("includes current prefix in destination when navigated into folder", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      await user.click(screen.getByText("docs"))
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      expect(trpcState.copyMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: "/source-container/docs/report.pdf",
        })
      )
    })

    test("does not call copyMutate when object name is invalid", async () => {
      const user = userEvent.setup()
      renderModal({ object: makeObject("report.pdf", "report.pdf") })
      const nameInput = screen.getByDisplayValue("report.pdf")
      await user.clear(nameInput)
      await user.click(screen.getByRole("button", { name: /^Move$/i }))
      expect(trpcState.copyMutate).not.toHaveBeenCalled()
    })

    test("shows Moving... label and spinner when copy is pending", () => {
      trpcState.copyIsPending = true
      renderModal()
      expect(screen.getByText(/Moving\.\.\./i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Moving\.\.\./i })).toBeDisabled()
    })

    test("shows Moving... label when delete is pending", () => {
      trpcState.deleteIsPending = true
      renderModal()
      expect(screen.getByRole("button", { name: /Moving\.\.\./i })).toBeDisabled()
    })

    test("shows copy error message when copy fails", () => {
      trpcState.copyIsError = true
      trpcState.copyError = { message: "Forbidden" }
      renderModal()
      expect(screen.getByText(/Failed to move object/i)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/i)).toBeInTheDocument()
    })

    test("shows partial failure message when delete fails after copy", () => {
      trpcState.deleteIsError = true
      trpcState.deleteError = { message: "Delete failed" }
      renderModal()
      expect(screen.getByText(/could not be deleted from the source/i)).toBeInTheDocument()
    })
  })

  // ── Cancel ────────────────────────────────────────────────────────────────

  describe("Cancel", () => {
    test("calls onClose when Cancel is clicked", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("resets both mutations when cancelled", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(trpcState.copyReset).toHaveBeenCalled()
      expect(trpcState.deleteReset).toHaveBeenCalled()
    })
  })

  // ── Container loading ─────────────────────────────────────────────────────

  describe("Container loading state", () => {
    test("Move button is disabled while containers are loading", () => {
      trpcState.isLoadingContainers = true
      renderModal()
      expect(screen.getByRole("button", { name: /^Move$/i })).toBeDisabled()
    })
  })

  // ── State reset ───────────────────────────────────────────────────────────

  describe("State reset", () => {
    test("resets object name to new object's displayName when reopened for a different object", () => {
      const { rerender } = renderModal({ isOpen: true, object: makeObject("first.pdf", "first.pdf") })
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <MoveRenameObjectModal isOpen={false} object={makeObject("first.pdf", "first.pdf")} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <MoveRenameObjectModal isOpen={true} object={makeObject("second.pdf", "second.pdf")} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      expect(screen.getByDisplayValue("second.pdf")).toBeInTheDocument()
    })

    test("resets prefix to root when modal reopens", async () => {
      const user = userEvent.setup()
      const { rerender } = renderModal({ isOpen: true })
      await user.click(screen.getByText("docs"))
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <MoveRenameObjectModal isOpen={false} object={makeObject()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <MoveRenameObjectModal isOpen={true} object={makeObject()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      expect(screen.getByText(/Root/i)).toBeInTheDocument()
    })
  })
})
