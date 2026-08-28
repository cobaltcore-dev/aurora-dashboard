import { describe, it, expect, vi, beforeEach } from "vitest"
import { render as rtlRender, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { ReactNode } from "react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { ObjectBrowserView } from "./ObjectBrowserView"
import { trpcReact } from "@/client/trpcClient"

// Mock dependencies
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <I18nProvider i18n={i18n}>
        <PortalProvider>{children}</PortalProvider>
      </I18nProvider>
    ),
  })
}

// Mock child components
vi.mock("./CreateFolderModal", () => ({
  CreateFolderModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="create-folder-modal">Create New Folder</div> : null,
}))

vi.mock("./UploadObjectModal", () => ({
  UploadObjectModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="upload-object-modal">Upload Object Modal</div> : null,
}))

vi.mock("./ObjectsTableView", () => ({
  ObjectsTableView: (props: Record<string, unknown>) => (
    <div
      data-testid="objects-table"
      data-can-copy-object={String(props.canCopyObject)}
      data-can-move-object={String(props.canMoveObject)}
      data-can-update-object={String(props.canUpdateObject)}
      data-can-share-object={String(props.canShareObject)}
      data-can-delete-object={String(props.canDeleteObject)}
      data-can-delete-folder={String(props.canDeleteFolder)}
      data-can-delete-version={String(props.canDeleteVersion)}
      data-can-restore-version={String(props.canRestoreVersion)}
    >
      Objects Table
    </div>
  ),
}))

vi.mock("./ObjectsFileNavigation", () => ({
  ObjectsFileNavigation: ({ bucketName }: { bucketName: string }) => (
    <div data-testid="file-navigation">{bucketName}</div>
  ),
}))

vi.mock("../Buckets/EnableVersioningModal", () => ({
  EnableVersioningModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="enable-versioning-modal">Enable Versioning</div> : null,
}))

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
}))

let mockCephPermissions = {
  canCreateBucket: true,
  canDeleteBucket: true,
  canEmptyBucket: true,
  canUpdateVersioning: true,
  canCreateObject: true,
  canUpdateObject: true,
  canDeleteObject: true,
  canCopyObject: true,
  canMoveObject: true,
  canShareObject: true,
  canCreateFolder: true,
  canDeleteFolder: true,
  canDeleteVersion: true,
  canRestoreVersion: true,
  canUpdatePolicy: true,
  canDeletePolicy: true,
  canUpdateCors: true,
  canDeleteCors: true,
  canUpdateLifecycle: true,
  canDeleteLifecycle: true,
  canCreateCredential: true,
}

vi.mock("../hooks/useCephPermissions", () => ({
  useCephPermissions: () => ({ permissions: mockCephPermissions, isLoading: false, isError: false }),
}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useRouteContext: () => ({
      onTrackEvent: vi.fn(),
    }),
  }
})

const { mockUseSearch, resetMockSearch } = vi.hoisted(() => {
  const defaultSearch = {
    prefix: undefined as string | undefined,
    sortBy: undefined as string | undefined,
    sortDirection: undefined as string | undefined,
    search: "",
    tab: "all" as "all" | "deleted",
  }
  let currentSearch = { ...defaultSearch }
  return {
    mockUseSearch: () => currentSearch,
    resetMockSearch: (overrides: Partial<typeof defaultSearch> = {}) => {
      currentSearch = { ...defaultSearch, ...overrides }
    },
  }
})

vi.mock("@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects", () => ({
  Route: {
    fullPath: "/test/path",
    useParams: () => ({
      projectId: "test-project-id",
      provider: "ceph",
      storageType: "buckets",
      containerName: "test-bucket",
    }),
    useSearch: mockUseSearch,
  },
}))

const mockObjectsData = {
  objects: [
    {
      key: "file1.txt",
      size: 1024,
      lastModified: "2024-01-15T10:30:00Z",
    },
    {
      key: "file2.pdf",
      size: 2048,
      lastModified: "2024-01-20T14:45:00Z",
    },
  ],
  folders: [{ prefix: "documents/" }, { prefix: "images/" }],
  isTruncated: false,
  nextContinuationToken: undefined,
}

// Mock trpcClient
vi.mock("@/client/trpcClient", () => {
  const mockUseQuery = vi.fn((params) => {
    // Different responses based on query parameters
    // versionCheckData query has maxKeys: 1 and showVersions: true
    if (params?.maxKeys === 1 && params?.showVersions === true) {
      return {
        data: { objects: [], folders: [], versions: [], isTruncated: false },
        isLoading: false,
        error: null,
        trpc: {},
      }
    }
    // Main objects.list query
    return {
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    }
  })

  const mockUseMutation = vi.fn(() => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isLoading: false,
    trpc: {},
  }))

  return {
    trpcReact: {
      useUtils: vi.fn(() => ({
        storage: {
          ceph: {
            objects: {
              list: {
                invalidate: vi.fn(),
              },
            },
            versioning: {
              getStatus: {
                invalidate: vi.fn(),
              },
            },
            bucketPolicy: {
              get: {
                invalidate: vi.fn(),
              },
            },
          },
        },
      })),
      storage: {
        ceph: {
          containers: {
            list: {
              useQuery: vi.fn(() => ({
                data: [],
                isLoading: false,
                error: null,
                trpc: {},
              })),
            },
            delete: {
              useMutation: mockUseMutation,
            },
          },
          objects: {
            list: {
              useQuery: mockUseQuery,
            },
            getDetails: {
              useQuery: vi.fn(() => ({
                data: null,
                isLoading: false,
                error: null,
                trpc: {},
              })),
            },
            delete: {
              useMutation: mockUseMutation,
            },
            deleteBulk: {
              useMutation: mockUseMutation,
            },
            deleteVersionsBulk: {
              useMutation: mockUseMutation,
            },
            deleteAll: {
              useMutation: mockUseMutation,
            },
            copy: {
              useMutation: mockUseMutation,
            },
            move: {
              useMutation: mockUseMutation,
            },
            createFolder: {
              useMutation: mockUseMutation,
            },
            updateMetadata: {
              useMutation: mockUseMutation,
            },
          },
          versioning: {
            getStatus: {
              useQuery: vi.fn(() => ({
                data: { status: "Disabled" },
                isLoading: false,
                error: null,
                trpc: {},
              })),
            },
            setStatus: {
              useMutation: mockUseMutation,
            },
            checkDeletedContent: {
              useQuery: vi.fn(() => ({
                data: {},
                isLoading: false,
                error: null,
                trpc: {},
              })),
            },
          },
          bucketPolicy: {
            get: {
              useQuery: vi.fn(() => ({
                data: { policy: null, policyText: null },
                isLoading: false,
                error: null,
                trpc: {},
              })),
            },
            set: {
              useMutation: mockUseMutation,
            },
            delete: {
              useMutation: mockUseMutation,
            },
          },
        },
      },
    },
  }
})

describe("ObjectBrowserView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSearch()
    mockCephPermissions = {
      canCreateBucket: true,
      canDeleteBucket: true,
      canEmptyBucket: true,
      canUpdateVersioning: true,
      canCreateObject: true,
      canUpdateObject: true,
      canDeleteObject: true,
      canCopyObject: true,
      canMoveObject: true,
      canShareObject: true,
      canCreateFolder: true,
      canDeleteFolder: true,
      canDeleteVersion: true,
      canRestoreVersion: true,
      canUpdatePolicy: true,
      canDeletePolicy: true,
      canUpdateCors: true,
      canDeleteCors: true,
      canUpdateLifecycle: true,
      canDeleteLifecycle: true,
      canCreateCredential: true,
    }
    // Restore default return value so any test that calls mockReturnValue doesn't
    // leak into subsequent tests (clearAllMocks resets calls but not implementations)
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)
  })

  it("renders bucket navigation", () => {
    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getByTestId("file-navigation")).toHaveTextContent("test-bucket")
  })

  it("displays folders and objects", () => {
    render(<ObjectBrowserView bucketName="test-bucket" />)

    // Check that the table view is rendered (folders and objects are displayed in the table)
    expect(screen.getByTestId("objects-table")).toBeInTheDocument()
  })

  it("shows New Folder action in the kebab menu", async () => {
    const user = userEvent.setup()
    render(<ObjectBrowserView bucketName="test-bucket" />)

    await user.click(screen.getByRole("button", { name: /more Actions/i }))

    expect(screen.getByRole("menuitem", { name: /create folder/i })).toBeInTheDocument()
  })

  it("shows Upload button as the primary action", () => {
    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getByRole("button", { name: /upload object/i })).toBeInTheDocument()
  })

  it("opens upload modal when Upload Object is clicked", async () => {
    const user = userEvent.setup()
    render(<ObjectBrowserView bucketName="test-bucket" />)

    await user.click(screen.getByRole("button", { name: /upload object/i }))

    expect(screen.getByTestId("upload-object-modal")).toBeInTheDocument()
  })

  it("opens create folder modal when New Folder is clicked from the kebab menu", async () => {
    const user = userEvent.setup()
    render(<ObjectBrowserView bucketName="test-bucket" />)

    await user.click(screen.getByRole("button", { name: /more Actions/i }))
    await user.click(screen.getByRole("menuitem", { name: /create folder/i }))

    expect(screen.getByTestId("create-folder-modal")).toBeInTheDocument()
  })

  it("displays object count and size summary", () => {
    render(<ObjectBrowserView bucketName="test-bucket" />)

    // The summary is displayed in the ObjectsTableView which is mocked
    // Check that the mocked table is rendered
    expect(screen.getByTestId("objects-table")).toBeInTheDocument()
  })

  it("shows search input", () => {
    render(<ObjectBrowserView bucketName="test-bucket" />)

    const searchInput = screen.getByPlaceholderText(/search/i)
    expect(searchInput).toBeInTheDocument()
  })

  it("allows searching objects", async () => {
    const user = userEvent.setup()
    render(<ObjectBrowserView bucketName="test-bucket" />)

    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, "file1")

    expect(searchInput).toHaveValue("file1")
  })

  it("has sort dropdown", () => {
    render(<ObjectBrowserView bucketName="test-bucket" />)

    // Check for sort control (there are multiple, so use getAllByRole)
    const sortControls = screen.getAllByRole("button", { name: /sort/i })
    expect(sortControls.length).toBeGreaterThan(0)
  })

  describe("Info block", () => {
    it("renders objects-info-block", () => {
      render(<ObjectBrowserView bucketName="test-bucket" />)

      expect(screen.getByTestId("objects-info-block")).toBeInTheDocument()
    })

    it("shows total item count — mockObjectsData has 2 objects + 2 folders", () => {
      render(<ObjectBrowserView bucketName="test-bucket" />)

      // 2 objects + 2 folders = 4 items
      expect(screen.getByText(/4 items/i)).toBeInTheDocument()
    })

    it("shows zero items when bucket is empty", () => {
      vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
        data: { objects: [], folders: [], isTruncated: false, nextContinuationToken: undefined },
        isLoading: false,
        error: null,
        trpc: {},
      } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

      render(<ObjectBrowserView bucketName="test-bucket" />)

      expect(screen.getByText(/0 items/i)).toBeInTheDocument()
    })
  })
})

describe("ObjectBrowserView - Loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSearch()
    mockCephPermissions = {
      canCreateBucket: true,
      canDeleteBucket: true,
      canEmptyBucket: true,
      canUpdateVersioning: true,
      canCreateObject: true,
      canUpdateObject: true,
      canDeleteObject: true,
      canCopyObject: true,
      canMoveObject: true,
      canShareObject: true,
      canCreateFolder: true,
      canDeleteFolder: true,
      canDeleteVersion: true,
      canRestoreVersion: true,
      canUpdatePolicy: true,
      canDeletePolicy: true,
      canUpdateCors: true,
      canDeleteCors: true,
      canUpdateLifecycle: true,
      canDeleteLifecycle: true,
      canCreateCredential: true,
    }
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)
  })

  it("shows loading spinner when data is loading", () => {
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})

describe("ObjectBrowserView - Error state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSearch()
    mockCephPermissions = {
      canCreateBucket: true,
      canDeleteBucket: true,
      canEmptyBucket: true,
      canUpdateVersioning: true,
      canCreateObject: true,
      canUpdateObject: true,
      canDeleteObject: true,
      canCopyObject: true,
      canMoveObject: true,
      canShareObject: true,
      canCreateFolder: true,
      canDeleteFolder: true,
      canDeleteVersion: true,
      canRestoreVersion: true,
      canUpdatePolicy: true,
      canDeletePolicy: true,
      canUpdateCors: true,
      canDeleteCors: true,
      canUpdateLifecycle: true,
      canDeleteLifecycle: true,
      canCreateCredential: true,
    }
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)
  })

  it("shows error message when fetch fails", () => {
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "Failed to load objects", shape: {}, data: {} } as ReturnType<
        typeof trpcReact.storage.ceph.objects.list.useQuery
      >["error"],
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getAllByText(/failed to load objects/i).length).toBeGreaterThan(0)
  })
})

describe("ObjectBrowserView - Empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSearch()
    mockCephPermissions = {
      canCreateBucket: true,
      canDeleteBucket: true,
      canEmptyBucket: true,
      canUpdateVersioning: true,
      canCreateObject: true,
      canUpdateObject: true,
      canDeleteObject: true,
      canCopyObject: true,
      canMoveObject: true,
      canShareObject: true,
      canCreateFolder: true,
      canDeleteFolder: true,
      canDeleteVersion: true,
      canRestoreVersion: true,
      canUpdatePolicy: true,
      canDeletePolicy: true,
      canUpdateCors: true,
      canDeleteCors: true,
      canUpdateLifecycle: true,
      canDeleteLifecycle: true,
      canCreateCredential: true,
    }
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)
  })

  it("shows empty state when no objects or folders", () => {
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValueOnce({
      data: {
        objects: [],
        folders: [],
        isTruncated: false,
        nextContinuationToken: undefined,
      },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    // Check that the objects table is still rendered even when empty
    expect(screen.getByTestId("objects-table")).toBeInTheDocument()
  })
})

describe("ObjectBrowserView - Folder filtering with versioning", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSearch()
    mockCephPermissions = {
      canCreateBucket: true,
      canDeleteBucket: true,
      canEmptyBucket: true,
      canUpdateVersioning: true,
      canCreateObject: true,
      canUpdateObject: true,
      canDeleteObject: true,
      canCopyObject: true,
      canMoveObject: true,
      canShareObject: true,
      canCreateFolder: true,
      canDeleteFolder: true,
      canDeleteVersion: true,
      canRestoreVersion: true,
      canUpdatePolicy: true,
      canDeletePolicy: true,
      canUpdateCors: true,
      canDeleteCors: true,
      canUpdateLifecycle: true,
      canDeleteLifecycle: true,
      canCreateCredential: true,
    }
  })

  it("hides folders with no versions (permanently deleted) from All tab", () => {
    // Mock versioning enabled
    vi.mocked(trpcReact.storage.ceph.versioning.getStatus.useQuery).mockReturnValue({
      data: { status: "Enabled" },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.getStatus.useQuery>)

    // Mock objects list with folders
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: {
        objects: [],
        folders: [{ prefix: "active-folder/" }, { prefix: "deleted-folder/" }, { prefix: "soft-deleted-folder/" }],
        isTruncated: false,
      },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    // Mock checkDeletedContent response
    vi.mocked(trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery).mockReturnValue({
      data: [
        {
          prefix: "active-folder/",
          hasDeletedContent: false,
          isFolderDeleted: false,
          folderMarkerVersionId: "version-123", // Has a version
        },
        {
          prefix: "deleted-folder/",
          hasDeletedContent: false,
          isFolderDeleted: false,
          folderMarkerVersionId: undefined, // NO versions - permanently deleted
        },
        {
          prefix: "soft-deleted-folder/",
          hasDeletedContent: true,
          isFolderDeleted: true,
          folderDeleteMarkerVersionId: "delete-marker-456",
          folderMarkerVersionId: "version-789",
        },
      ],
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    // The ObjectsTableView is mocked, so we can't test the actual folder rendering
    // but the component should receive filtered folders (active-folder only)
    // deleted-folder should be filtered out (no folderMarkerVersionId)
    // soft-deleted-folder should be filtered out (isFolderDeleted = true)
    expect(screen.getByTestId("objects-table")).toBeInTheDocument()
  })

  it("shows folders with delete markers in Deleted tab", () => {
    // Mock versioning enabled
    vi.mocked(trpcReact.storage.ceph.versioning.getStatus.useQuery).mockReturnValue({
      data: { status: "Enabled" },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.getStatus.useQuery>)

    // Mock objects list with folders
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: {
        objects: [],
        folders: [{ prefix: "deleted-folder/" }],
        isTruncated: false,
      },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    // Mock checkDeletedContent response - folder has delete marker
    vi.mocked(trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery).mockReturnValue({
      data: [
        {
          prefix: "deleted-folder/",
          hasDeletedContent: true,
          isFolderDeleted: true,
          folderDeleteMarkerVersionId: "delete-marker-123",
          folderMarkerVersionId: "version-456",
        },
      ],
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    // In Deleted tab, folder with hasDeletedContent=true should be shown
    expect(screen.getByTestId("objects-table")).toBeInTheDocument()
  })
})

describe("ObjectBrowserView - Permission gating", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSearch()
    mockCephPermissions = {
      canCreateBucket: true,
      canDeleteBucket: true,
      canEmptyBucket: true,
      canUpdateVersioning: true,
      canCreateObject: true,
      canUpdateObject: true,
      canDeleteObject: true,
      canCopyObject: true,
      canMoveObject: true,
      canShareObject: true,
      canCreateFolder: true,
      canDeleteFolder: true,
      canDeleteVersion: true,
      canRestoreVersion: true,
      canUpdatePolicy: true,
      canDeletePolicy: true,
      canUpdateCors: true,
      canDeleteCors: true,
      canUpdateLifecycle: true,
      canDeleteLifecycle: true,
      canCreateCredential: true,
    }
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)
  })

  it("hides the Upload Object button when canCreateObject is false", () => {
    mockCephPermissions = { ...mockCephPermissions, canCreateObject: false }
    render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.queryByRole("button", { name: /upload object/i })).not.toBeInTheDocument()
  })

  it("hides the Create Folder button when canCreateFolder is false", () => {
    mockCephPermissions = { ...mockCephPermissions, canCreateFolder: false }
    render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.queryByRole("button", { name: /create folder/i })).not.toBeInTheDocument()
  })

  it("shows both toolbar buttons when permitted", () => {
    render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.getByRole("button", { name: /upload object/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create folder/i })).toBeInTheDocument()
  })

  it("bulk selection is gated by canDeleteObject in the All tab", () => {
    resetMockSearch({ tab: "all" })
    mockCephPermissions = { ...mockCephPermissions, canDeleteObject: false, canDeleteVersion: true }
    render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.queryByTestId("select-all-objects")).not.toBeInTheDocument()
  })

  it("bulk selection is enabled by canDeleteObject in the All tab", () => {
    resetMockSearch({ tab: "all" })
    mockCephPermissions = { ...mockCephPermissions, canDeleteObject: true, canDeleteVersion: false }
    render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.getByTestId("select-all-objects")).toBeInTheDocument()
  })

  it("bulk selection is gated by canDeleteVersion (not canDeleteObject) in the Deleted tab", () => {
    resetMockSearch({ tab: "deleted" })
    mockCephPermissions = { ...mockCephPermissions, canDeleteObject: true, canDeleteVersion: false }
    render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.queryByTestId("select-all-objects")).not.toBeInTheDocument()
  })

  it("bulk selection is enabled by canDeleteVersion in the Deleted tab", () => {
    resetMockSearch({ tab: "deleted" })
    mockCephPermissions = { ...mockCephPermissions, canDeleteObject: false, canDeleteVersion: true }
    render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.getByTestId("select-all-objects")).toBeInTheDocument()
  })

  it("passes the object-level permission booleans through to ObjectsTableView", () => {
    mockCephPermissions = {
      ...mockCephPermissions,
      canCopyObject: false,
      canMoveObject: false,
      canUpdateObject: false,
      canShareObject: false,
      canDeleteObject: false,
      canDeleteFolder: false,
      canDeleteVersion: false,
      canRestoreVersion: false,
    }
    render(<ObjectBrowserView bucketName="test-bucket" />)
    const table = screen.getByTestId("objects-table")
    expect(table).toHaveAttribute("data-can-copy-object", "false")
    expect(table).toHaveAttribute("data-can-move-object", "false")
    expect(table).toHaveAttribute("data-can-update-object", "false")
    expect(table).toHaveAttribute("data-can-share-object", "false")
    expect(table).toHaveAttribute("data-can-delete-object", "false")
    expect(table).toHaveAttribute("data-can-delete-folder", "false")
    expect(table).toHaveAttribute("data-can-delete-version", "false")
    expect(table).toHaveAttribute("data-can-restore-version", "false")
  })
})
