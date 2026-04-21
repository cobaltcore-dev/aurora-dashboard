import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { SwiftObjects } from "./"
import type { ObjectSummary } from "@/server/Storage/types/swift"

// ─── Hoisted mocks ───────────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file by Vitest, so any
// variables they reference must also be hoisted via vi.hoisted().

const { mockNavigate, mockUseSearch, resetSearch } = vi.hoisted(() => {
  let currentSearch: Record<string, string | undefined> = {
    prefix: undefined,
    sortBy: undefined,
    sortDirection: undefined,
    search: undefined,
  }

  const mockUseSearch = vi.fn(() => currentSearch)

  const mockNavigate = vi.fn(({ search }: { search?: (prev: typeof currentSearch) => typeof currentSearch }) => {
    if (typeof search === "function") {
      currentSearch = search(currentSearch)
      mockUseSearch.mockReturnValue(currentSearch)
    }
  })

  return {
    mockNavigate,
    mockUseSearch,
    getSearch: () => currentSearch,
    resetSearch: () => {
      currentSearch = { prefix: undefined, sortBy: undefined, sortDirection: undefined, search: undefined }
      mockUseSearch.mockReturnValue(currentSearch)
    },
  }
})

// ─── Mock TanStack Router ─────────────────────────────────────────────────────

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
    useNavigate: vi.fn(() => mockNavigate),
  }
})

// ─── Mock Route (search params + fullPath) ────────────────────────────────────

vi.mock("../../../$provider/containers/$containerName/objects", () => ({
  Route: {
    fullPath: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/",
    useSearch: mockUseSearch,
    useParams: vi.fn(() => ({
      accountId: "test-account",
      projectId: "test-project",
      provider: "swift",
      containerName: "test-container",
    })),
  },
}))

// ─── Mock child components ────────────────────────────────────────────────────
// We test index.tsx in isolation — child components are tested separately.

// Capture the latest callbacks so tests can invoke them directly
let capturedOnDeleteFolderSuccess: ((folderName: string, deletedCount: number) => void) | undefined
let capturedOnDownloadError: ((objectName: string, errorMessage: string) => void) | undefined
let capturedOnCopyObjectSuccess: ((objectName: string, targetContainer: string, targetPath: string) => void) | undefined
let capturedOnCopyObjectError: ((objectName: string, errorMessage: string) => void) | undefined
let capturedOnMoveObjectSuccess: ((objectName: string, targetContainer: string, targetPath: string) => void) | undefined
let capturedOnMoveObjectError: ((objectName: string, errorMessage: string) => void) | undefined
let capturedOnTempUrlCopySuccess: ((objectName: string) => void) | undefined
let capturedOnEditMetadataSuccess: ((objectName: string) => void) | undefined
let capturedOnEditMetadataError: ((objectName: string, errorMessage: string) => void) | undefined
let capturedOnUploadSuccess: ((objectName: string) => void) | undefined
let capturedOnUploadError: ((objectName: string, errorMessage: string) => void) | undefined

vi.mock("./ObjectsTableView", () => ({
  ObjectsTableView: vi.fn(
    ({
      container,
      rows,
      searchTerm,
      onDeleteFolderSuccess,
      onDeleteFolderError,
      onDownloadError,
      onDeleteObjectSuccess,
      onDeleteObjectError,
      onCopyObjectSuccess,
      onCopyObjectError,
      onMoveObjectSuccess,
      onMoveObjectError,
      onTempUrlCopySuccess,
      onEditMetadataSuccess,
      onEditMetadataError,
    }) => {
      capturedOnDeleteFolderSuccess = onDeleteFolderSuccess
      capturedOnDownloadError = onDownloadError
      capturedOnCopyObjectSuccess = onCopyObjectSuccess
      capturedOnCopyObjectError = onCopyObjectError
      capturedOnMoveObjectSuccess = onMoveObjectSuccess
      capturedOnMoveObjectError = onMoveObjectError
      capturedOnTempUrlCopySuccess = onTempUrlCopySuccess
      capturedOnEditMetadataSuccess = onEditMetadataSuccess
      capturedOnEditMetadataError = onEditMetadataError
      return (
        <div
          data-testid="objects-table-view"
          data-container={container}
          data-row-count={rows.length}
          data-search={searchTerm}
          data-has-delete-success={typeof onDeleteFolderSuccess === "function" ? "true" : "false"}
          data-has-delete-error={typeof onDeleteFolderError === "function" ? "true" : "false"}
          data-has-download-error={typeof onDownloadError === "function" ? "true" : "false"}
          data-has-delete-object-success={typeof onDeleteObjectSuccess === "function" ? "true" : "false"}
          data-has-delete-object-error={typeof onDeleteObjectError === "function" ? "true" : "false"}
          data-has-copy-object-success={typeof onCopyObjectSuccess === "function" ? "true" : "false"}
          data-has-copy-object-error={typeof onCopyObjectError === "function" ? "true" : "false"}
          data-has-move-object-success={typeof onMoveObjectSuccess === "function" ? "true" : "false"}
          data-has-move-object-error={typeof onMoveObjectError === "function" ? "true" : "false"}
          data-has-temp-url-copy-success={typeof onTempUrlCopySuccess === "function" ? "true" : "false"}
          data-has-edit-metadata-success={typeof onEditMetadataSuccess === "function" ? "true" : "false"}
          data-has-edit-metadata-error={typeof onEditMetadataError === "function" ? "true" : "false"}
        />
      )
    }
  ),
}))

vi.mock("./ObjectsFileNavigation", () => ({
  ObjectsFileNavigation: vi.fn(({ containerName, currentPrefix }) => (
    <div data-testid="objects-file-navigation" data-container={containerName} data-prefix={currentPrefix} />
  )),
}))

// CreateFolderModal uses tRPC hooks internally — mock it to keep index tests isolated.
vi.mock("./CreateFolderModal", () => ({
  CreateFolderModal: vi.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="create-folder-modal">
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

// UploadObjectModal uses tRPC hooks internally — mock it to keep index tests isolated.
vi.mock("./UploadObjectModal", () => ({
  UploadObjectModal: vi.fn(({ isOpen, onClose, onSuccess, onError }) => {
    capturedOnUploadSuccess = onSuccess
    capturedOnUploadError = onError
    return isOpen ? (
      <div data-testid="upload-object-modal">
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  }),
}))

// ─── Mock tRPC ────────────────────────────────────────────────────────────────

const mockObjects: ObjectSummary[] = [
  { name: "file-a.txt", hash: "abc", bytes: 100, content_type: "text/plain", last_modified: "2024-03-01T08:00:00" },
  { name: "file-b.png", hash: "def", bytes: 2048, content_type: "image/png", last_modified: "2024-02-01T08:00:00" },
  {
    name: "folder/",
    hash: "000",
    bytes: 0,
    content_type: "application/directory",
    last_modified: "2024-01-01T08:00:00",
  },
]

let trpcState = {
  objects: mockObjects as ObjectSummary[] | undefined,
  isLoading: false,
  error: null as { message: string } | null,
}

vi.mock("./ObjectToastNotifications", () => ({
  getFolderCreatedToast: vi.fn(() => ({ variant: "success", children: null })),
  getFolderCreateErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getFolderDeletedToast: vi.fn(() => ({ variant: "success", children: null })),
  getFolderDeleteErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getObjectDownloadErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getObjectDeletedToast: vi.fn(() => ({ variant: "success", children: null })),
  getObjectDeleteErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getObjectCopiedToast: vi.fn(() => ({ variant: "success", children: null })),
  getObjectCopyErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getObjectMovedToast: vi.fn(() => ({ variant: "success", children: null })),
  getObjectMoveErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getTempUrlCopiedToast: vi.fn(() => ({ variant: "success", children: null })),
  getObjectMetadataUpdatedToast: vi.fn(() => ({ variant: "success", children: null })),
  getObjectMetadataUpdateErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getObjectUploadedToast: vi.fn(() => ({ variant: "success", children: null })),
  getObjectUploadErrorToast: vi.fn(() => ({ variant: "error", children: null })),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      swift: {
        listObjects: {
          useQuery: () => ({
            data: trpcState.objects,
            isLoading: trpcState.isLoading,
            error: trpcState.error,
          }),
        },
        downloadObject: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
      },
    },
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderObjects = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <SwiftObjects />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SwiftObjects (index)", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetSearch()
    trpcState = { objects: mockObjects, isLoading: false, error: null }
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Loading state", () => {
    test("shows loading spinner while fetching", () => {
      trpcState.isLoading = true
      trpcState.objects = undefined
      renderObjects()
      expect(screen.getByText(/Loading Objects/i)).toBeInTheDocument()
    })

    test("does not render table view while loading", () => {
      trpcState.isLoading = true
      trpcState.objects = undefined
      renderObjects()
      expect(screen.queryByTestId("objects-table-view")).not.toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    test("shows error message when query fails", () => {
      trpcState.error = { message: "Network error" }
      trpcState.objects = undefined
      renderObjects()
      expect(screen.getByText(/Error Loading Objects/i)).toBeInTheDocument()
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    })

    test("does not render table view on error", () => {
      trpcState.error = { message: "Network error" }
      renderObjects()
      expect(screen.queryByTestId("objects-table-view")).not.toBeInTheDocument()
    })
  })

  describe("Rendering", () => {
    test("renders ObjectsFileNavigation with correct container name", () => {
      renderObjects()
      const nav = screen.getByTestId("objects-file-navigation")
      expect(nav).toBeInTheDocument()
      expect(nav).toHaveAttribute("data-container", "test-container")
    })

    test("renders ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toBeInTheDocument()
    })

    test("passes correct row count to ObjectsTableView", () => {
      renderObjects()
      // 2 files + 1 folder from mockObjects
      const view = screen.getByTestId("objects-table-view")
      expect(view).toHaveAttribute("data-row-count", "3")
    })

    test("renders Create folder button", () => {
      renderObjects()
      expect(screen.getByRole("button", { name: /Create Folder/i })).toBeInTheDocument()
    })

    test("renders Upload Object button", () => {
      renderObjects()
      expect(screen.getByRole("button", { name: /Upload Object/i })).toBeInTheDocument()
    })

    test("Create folder modal is closed by default", () => {
      renderObjects()
      expect(screen.queryByTestId("create-folder-modal")).not.toBeInTheDocument()
    })

    test("passes onDeleteFolderSuccess callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-delete-success", "true")
    })

    test("passes onDeleteFolderError callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-delete-error", "true")
    })

    test("passes container name to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-container", "test-container")
    })

    test("passes onDownloadError callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-download-error", "true")
    })

    test("onDownloadError shows error toast via getObjectDownloadErrorToast", async () => {
      const { getObjectDownloadErrorToast } = await import("./ObjectToastNotifications")
      renderObjects()
      await act(async () => {
        capturedOnDownloadError?.("report.pdf", "403 Forbidden")
      })
      expect(getObjectDownloadErrorToast).toHaveBeenCalledWith(
        "report.pdf",
        "403 Forbidden",
        expect.objectContaining({ onDismiss: expect.any(Function) })
      )
    })

    test("passes onDeleteObjectSuccess callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-delete-object-success", "true")
    })

    test("passes onDeleteObjectError callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-delete-object-error", "true")
    })

    test("passes onCopyObjectSuccess callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-copy-object-success", "true")
    })

    test("passes onCopyObjectError callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-copy-object-error", "true")
    })

    test("onCopyObjectSuccess shows success toast via getObjectCopiedToast", async () => {
      const { getObjectCopiedToast } = await import("./ObjectToastNotifications")
      renderObjects()
      await act(async () => {
        capturedOnCopyObjectSuccess?.("report.pdf", "dest-container", "archive/")
      })
      expect(getObjectCopiedToast).toHaveBeenCalledWith(
        "report.pdf",
        "dest-container",
        "archive/",
        expect.objectContaining({ onDismiss: expect.any(Function) })
      )
    })

    test("onCopyObjectError shows error toast via getObjectCopyErrorToast", async () => {
      const { getObjectCopyErrorToast } = await import("./ObjectToastNotifications")
      renderObjects()
      await act(async () => {
        capturedOnCopyObjectError?.("report.pdf", "403 Forbidden")
      })
      expect(getObjectCopyErrorToast).toHaveBeenCalledWith(
        "report.pdf",
        "403 Forbidden",
        expect.objectContaining({ onDismiss: expect.any(Function) })
      )
    })

    test("passes onMoveObjectSuccess callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-move-object-success", "true")
    })

    test("passes onMoveObjectError callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-move-object-error", "true")
    })

    test("onMoveObjectSuccess shows success toast via getObjectMovedToast", async () => {
      const { getObjectMovedToast } = await import("./ObjectToastNotifications")
      renderObjects()
      await act(async () => {
        capturedOnMoveObjectSuccess?.("report.pdf", "dest-container", "archive/")
      })
      expect(getObjectMovedToast).toHaveBeenCalledWith(
        "report.pdf",
        "dest-container",
        "archive/",
        expect.objectContaining({ onDismiss: expect.any(Function) })
      )
    })

    test("onMoveObjectError shows error toast via getObjectMoveErrorToast", async () => {
      const { getObjectMoveErrorToast } = await import("./ObjectToastNotifications")
      renderObjects()
      await act(async () => {
        capturedOnMoveObjectError?.("report.pdf", "403 Forbidden")
      })
      expect(getObjectMoveErrorToast).toHaveBeenCalledWith(
        "report.pdf",
        "403 Forbidden",
        expect.objectContaining({ onDismiss: expect.any(Function) })
      )
    })

    test("passes onTempUrlCopySuccess callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-temp-url-copy-success", "true")
    })

    test("onTempUrlCopySuccess shows success toast via getTempUrlCopiedToast", async () => {
      const { getTempUrlCopiedToast } = await import("./ObjectToastNotifications")
      renderObjects()
      await act(async () => {
        capturedOnTempUrlCopySuccess?.("report.pdf")
      })
      expect(getTempUrlCopiedToast).toHaveBeenCalledWith(
        "report.pdf",
        expect.objectContaining({ onDismiss: expect.any(Function) })
      )
    })

    test("passes onEditMetadataSuccess callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-edit-metadata-success", "true")
    })

    test("passes onEditMetadataError callback to ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-has-edit-metadata-error", "true")
    })

    test("onEditMetadataSuccess shows success toast via getObjectMetadataUpdatedToast", async () => {
      const { getObjectMetadataUpdatedToast } = await import("./ObjectToastNotifications")
      renderObjects()
      await act(async () => {
        capturedOnEditMetadataSuccess?.("sample.txt")
      })
      expect(getObjectMetadataUpdatedToast).toHaveBeenCalledWith(
        "sample.txt",
        expect.objectContaining({ onDismiss: expect.any(Function) })
      )
    })

    test("onEditMetadataError shows error toast via getObjectMetadataUpdateErrorToast", async () => {
      const { getObjectMetadataUpdateErrorToast } = await import("./ObjectToastNotifications")
      renderObjects()
      await act(async () => {
        capturedOnEditMetadataError?.("sample.txt", "403 Forbidden")
      })
      expect(getObjectMetadataUpdateErrorToast).toHaveBeenCalledWith(
        "sample.txt",
        "403 Forbidden",
        expect.objectContaining({ onDismiss: expect.any(Function) })
      )
    })

    test("subtracts 1 from deletedCount before passing to getFolderDeletedToast", async () => {
      const { getFolderDeletedToast } = await import("./ObjectToastNotifications")
      renderObjects()
      // Simulate ObjectsTableView calling onDeleteFolderSuccess with Swift's raw count (includes placeholder)
      await act(async () => {
        capturedOnDeleteFolderSuccess?.("my-folder", 4)
      })
      // nestedCount = 4 - 1 = 3 should be passed to the toast factory
      expect(getFolderDeletedToast).toHaveBeenCalledWith("my-folder", 3, expect.any(Object))
    })
  })

  describe("Create folder modal", () => {
    test("opens modal when Create folder button is clicked", async () => {
      const user = userEvent.setup()
      renderObjects()
      await user.click(screen.getByRole("button", { name: /Create Folder/i }))
      expect(screen.getByTestId("create-folder-modal")).toBeInTheDocument()
    })

    test("closes modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderObjects()
      await user.click(screen.getByRole("button", { name: /Create Folder/i }))
      expect(screen.getByTestId("create-folder-modal")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(screen.queryByTestId("create-folder-modal")).not.toBeInTheDocument()
    })
  })

  describe("Upload object modal", () => {
    test("Upload object modal is closed by default", () => {
      renderObjects()
      expect(screen.queryByTestId("upload-object-modal")).not.toBeInTheDocument()
    })

    test("opens modal when Upload Object button is clicked", async () => {
      const user = userEvent.setup()
      renderObjects()
      await user.click(screen.getByRole("button", { name: /Upload Object/i }))
      expect(screen.getByTestId("upload-object-modal")).toBeInTheDocument()
    })

    test("closes modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderObjects()
      await user.click(screen.getByRole("button", { name: /Upload Object/i }))
      expect(screen.getByTestId("upload-object-modal")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(screen.queryByTestId("upload-object-modal")).not.toBeInTheDocument()
    })
  })

  describe("Upload object toast notifications", () => {
    test("shows success toast when upload succeeds", async () => {
      const { getObjectUploadedToast } = await import("./ObjectToastNotifications")
      renderObjects()
      act(() => {
        capturedOnUploadSuccess?.("report.pdf")
      })
      expect(getObjectUploadedToast).toHaveBeenCalledWith("report.pdf", expect.any(Object))
    })

    test("shows error toast when upload fails", async () => {
      const { getObjectUploadErrorToast } = await import("./ObjectToastNotifications")
      renderObjects()
      act(() => {
        capturedOnUploadError?.("report.pdf", "Quota exceeded")
      })
      expect(getObjectUploadErrorToast).toHaveBeenCalledWith("report.pdf", "Quota exceeded", expect.any(Object))
    })
  })

  describe("Search filtering", () => {
    test("calls navigate with search term when input changes", async () => {
      const user = userEvent.setup()
      renderObjects()
      await user.type(screen.getByPlaceholderText(/Search/i), "file-a")
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })
    })

    test("filters rows by search term from URL param", () => {
      // Simulate URL already containing a search param — component reads it from
      // Route.useSearch() on mount and passes filtered rows to ObjectsTableView.
      mockUseSearch.mockReturnValue({
        prefix: undefined,
        sortBy: undefined,
        sortDirection: undefined,
        search: "file-a",
      })
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-row-count", "1")
    })

    test("search filtering is case-insensitive", () => {
      mockUseSearch.mockReturnValue({
        prefix: undefined,
        sortBy: undefined,
        sortDirection: undefined,
        search: "FILE-A",
      })
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-row-count", "1")
    })

    test("shows all rows when search param is empty", () => {
      mockUseSearch.mockReturnValue({ prefix: undefined, sortBy: undefined, sortDirection: undefined, search: "" })
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-row-count", "3")
    })

    test("shows all rows when search param is undefined", () => {
      mockUseSearch.mockReturnValue({
        prefix: undefined,
        sortBy: undefined,
        sortDirection: undefined,
        search: undefined,
      })
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-row-count", "3")
    })
  })
})
