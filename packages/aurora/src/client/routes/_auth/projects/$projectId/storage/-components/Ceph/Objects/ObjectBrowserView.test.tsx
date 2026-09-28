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
      {(props.folders as Array<{ prefix: string }> | undefined)?.map((folder) => (
        <div key={folder.prefix} data-testid={`folder-${folder.prefix}`}>
          {folder.prefix}
        </div>
      ))}
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
    // Read by RouteIdLevelDefaultError, which this view renders for a folder that isn't there.
    useParams: () => ({ projectId: "test-project-id" }),
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
  const mockUseQuery = vi.fn(() => {
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
            containers: {
              list: {
                invalidate: vi.fn(),
              },
              getState: {
                invalidate: vi.fn(),
              },
            },
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
            getState: {
              useQuery: vi.fn(() => ({
                data: {
                  isVersioningEnabled: false,
                  isEmpty: true,
                  hasOnlyDeleteMarkers: false,
                  hasOldVersionsOrDeleteMarkers: false,
                  isPartialScan: false,
                },
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
      error: { message: "Failed to Load Objects", shape: {}, data: {} } as ReturnType<
        typeof trpcReact.storage.ceph.objects.list.useQuery
      >["error"],
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getAllByText(/Failed to Load Objects/i).length).toBeGreaterThan(0)
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
          isPartialScan: false,
        },
        {
          prefix: "deleted-folder/",
          hasDeletedContent: false,
          isFolderDeleted: false,
          folderMarkerVersionId: undefined, // NO versions - permanently deleted
          isPartialScan: false,
        },
        {
          prefix: "soft-deleted-folder/",
          hasDeletedContent: true,
          isFolderDeleted: true,
          folderDeleteMarkerVersionId: "delete-marker-456",
          folderMarkerVersionId: "version-789",
          isPartialScan: false,
        },
      ],
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getByTestId("folder-active-folder/")).toBeInTheDocument()
    expect(screen.queryByTestId("folder-deleted-folder/")).not.toBeInTheDocument()
    expect(screen.queryByTestId("folder-soft-deleted-folder/")).not.toBeInTheDocument()
  })

  it("asks for the bucket root as an explicit empty prefix, not as no prefix at all", () => {
    // Regression guard: `prefix: currentPrefix || undefined` collapsed the root to undefined,
    // which the procedure's input schema reads as "neither prefix nor folders given" and
    // rejects - silently killing the deleted-content indicators on the default view.
    vi.mocked(trpcReact.storage.ceph.versioning.getStatus.useQuery).mockReturnValue({
      data: { status: "Enabled" },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.getStatus.useQuery>)

    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: { objects: [], folders: [{ prefix: "a-folder/" }], isTruncated: false },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    const [input] = vi.mocked(trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery).mock.calls[0]
    expect(input).toMatchObject({ bucket: "test-bucket", prefix: "" })
  })

  it("shows folders with delete markers in Deleted tab", () => {
    resetMockSearch({ tab: "deleted" })
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
        versions: [],
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
          isPartialScan: false,
        },
      ],
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    // In Deleted tab, folder with hasDeletedContent=true should be shown
    expect(screen.getByTestId("folder-deleted-folder/")).toBeInTheDocument()
  })

  it("All tab: shows a folder whose scan is partial rather than hiding it (fail-open, high risk)", () => {
    vi.mocked(trpcReact.storage.ceph.versioning.getStatus.useQuery).mockReturnValue({
      data: { status: "Enabled" },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.getStatus.useQuery>)

    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: { objects: [], folders: [{ prefix: "unscanned-folder/" }], isTruncated: false },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    // Scan hit the page ceiling before reaching this folder: no confirmed marker, not
    // confirmed deleted either — must NOT be treated as "permanently deleted".
    vi.mocked(trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery).mockReturnValue({
      data: [
        {
          prefix: "unscanned-folder/",
          hasDeletedContent: false,
          isFolderDeleted: false,
          folderMarkerVersionId: undefined,
          isPartialScan: true,
        },
      ],
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getByTestId("folder-unscanned-folder/")).toBeInTheDocument()
  })

  it("All tab: still hides a folder that is confirmed deleted by a complete scan", () => {
    vi.mocked(trpcReact.storage.ceph.versioning.getStatus.useQuery).mockReturnValue({
      data: { status: "Enabled" },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.getStatus.useQuery>)

    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: { objects: [], folders: [{ prefix: "confirmed-deleted/" }], isTruncated: false },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    vi.mocked(trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery).mockReturnValue({
      data: [
        {
          prefix: "confirmed-deleted/",
          hasDeletedContent: true,
          isFolderDeleted: true,
          folderDeleteMarkerVersionId: "dm-1",
          folderMarkerVersionId: "v-1",
          isPartialScan: false,
        },
      ],
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.queryByTestId("folder-confirmed-deleted/")).not.toBeInTheDocument()
  })

  it("Deleted tab: a partial scan with no confirmed deleted content is not shown or mislabeled", () => {
    resetMockSearch({ tab: "deleted" })
    vi.mocked(trpcReact.storage.ceph.versioning.getStatus.useQuery).mockReturnValue({
      data: { status: "Enabled" },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.getStatus.useQuery>)

    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: { objects: [], folders: [{ prefix: "unscanned-folder/" }], versions: [], isTruncated: false },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    // Regression guard against the rejected "conservative fallback": an unresolved scan must
    // never be treated as "has deleted content" in the Deleted tab.
    vi.mocked(trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery).mockReturnValue({
      data: [
        {
          prefix: "unscanned-folder/",
          hasDeletedContent: false,
          isFolderDeleted: false,
          folderMarkerVersionId: undefined,
          isPartialScan: true,
        },
      ],
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.queryByTestId("folder-unscanned-folder/")).not.toBeInTheDocument()
  })

  it("sends a stable checkDeletedContent input keyed on prefix, not on the accumulated folder list", () => {
    vi.mocked(trpcReact.storage.ceph.versioning.getStatus.useQuery).mockReturnValue({
      data: { status: "Enabled" },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.getStatus.useQuery>)

    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: {
        objects: [],
        folders: [{ prefix: "folder1/" }],
        isTruncated: true,
        nextContinuationToken: "next-token",
      },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    const calls = vi.mocked(trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery).mock.calls
    expect(calls.length).toBeGreaterThan(0)
    const inputs = calls.map((call) => call[0])
    // Every render (including any triggered by "Load more" accumulating allFolders) must call
    // checkDeletedContent with the exact same input — no `folders` array, no growing payload.
    inputs.forEach((input) => {
      expect(input).toEqual(inputs[0])
      expect(input).not.toHaveProperty("folders")
      expect(input).toMatchObject({ project_id: "test-project-id", bucket: "test-bucket" })
    })
  })

  it("does not send a folders array even with more than 100 folders (no more BAD_REQUEST cap)", () => {
    vi.mocked(trpcReact.storage.ceph.versioning.getStatus.useQuery).mockReturnValue({
      data: { status: "Enabled" },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.versioning.getStatus.useQuery>)

    const manyFolders = Array.from({ length: 150 }, (_, i) => ({ prefix: `folder-${i}/` }))
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: { objects: [], folders: manyFolders, isTruncated: false },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    const calls = vi.mocked(trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery).mock.calls
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1][0]).not.toHaveProperty("folders")
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

  it("hides the More Actions menu when canCreateFolder is false", () => {
    mockCephPermissions = { ...mockCephPermissions, canCreateFolder: false }
    render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.queryByRole("button", { name: /more actions/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId("create-folder-action")).not.toBeInTheDocument()
  })

  it("shows the Upload button and the Create Folder menu item when permitted", async () => {
    const user = userEvent.setup()
    render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.getByRole("button", { name: /upload object/i })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /more actions/i }))
    expect(screen.getByRole("menuitem", { name: /create folder/i })).toBeInTheDocument()
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

/**
 * Per-folder state must not outlive its folder. `navigateToPrefix` clears it for a click on a
 * folder row, but the prefix also changes without it — browser back/forward, a deep link, a
 * hand-edited `?prefix=` — and a selection that survives that keeps the bulk actions pointed
 * at objects from the folder the user just left.
 */
describe("ObjectBrowserView - state carried across a folder change", () => {
  // "tmp/" — the URL carries the prefix base64-encoded.
  const TMP_PREFIX = "dG1wLw=="

  const lastListQueryInput = () => {
    // objects.list is called exactly once per render, with maxKeys: 1000 — the bucket-state
    // probes that used to also call it (useBucketInfo, DeleteBucketModal, EmptyBucketModal)
    // were migrated to containers.getState, so there's no second call to filter out anymore.
    const calls = vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mock.calls
    return calls[calls.length - 1][0] as { prefix?: string; continuationToken?: string }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSearch()
    mockCephPermissions = { ...mockCephPermissions, canDeleteObject: true }
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)
  })

  it("drops the selection when the prefix changes outside navigateToPrefix", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ObjectBrowserView bucketName="test-bucket" />)

    // The mocked listing is the same in both folders, so "select all" being checked after
    // the change can only mean the previous folder's selection survived.
    await user.click(screen.getByTestId("select-all-objects"))
    expect(screen.getByTestId("select-all-objects")).toBeChecked()

    // What a back/forward or a hand-edited address looks like from here: a new prefix, and
    // nothing else.
    resetMockSearch({ prefix: TMP_PREFIX })
    rerender(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getByTestId("select-all-objects")).not.toBeChecked()
  })

  it("shows the new folder's listing when its data is already in the cache", () => {
    const { rerender } = render(<ObjectBrowserView bucketName="test-bucket" />)
    expect(screen.getByTestId("objects-info-block")).toHaveTextContent(/4 items/i)

    resetMockSearch({ prefix: TMP_PREFIX })
    rerender(<ObjectBrowserView bucketName="test-bucket" />)

    // The mocked query answers immediately, as React Query does when it serves a listing
    // visited a moment ago — going back out of a folder, most of all. The reset must not
    // outrun that data and leave the browser empty.
    expect(screen.getByTestId("objects-info-block")).toHaveTextContent(/4 items/i)
  })

  it("keeps the selection across a re-render that does not change the folder", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ObjectBrowserView bucketName="test-bucket" />)

    await user.click(screen.getByTestId("select-all-objects"))
    rerender(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getByTestId("select-all-objects")).toBeChecked()
  })

  it("drops the pagination cursor when the prefix changes, so it is not replayed on the new folder", async () => {
    const user = userEvent.setup()
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: { ...mockObjectsData, isTruncated: true, nextContinuationToken: "page-2" },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    const { rerender } = render(<ObjectBrowserView bucketName="test-bucket" />)

    await user.click(screen.getByRole("button", { name: /load more/i }))
    expect(lastListQueryInput().continuationToken).toBe("page-2")

    resetMockSearch({ prefix: TMP_PREFIX })
    rerender(<ObjectBrowserView bucketName="test-bucket" />)

    // A continuation token belongs to the listing that produced it — sending it with another
    // prefix asks the server to continue a listing that no longer exists.
    expect(lastListQueryInput()).toMatchObject({ prefix: "tmp/", continuationToken: undefined })
  })
})

/**
 * A folder is not a stored thing — it is the common start of some keys — so the listing the
 * view already has is what settles whether the one named in `?prefix=` exists at all.
 */
describe("ObjectBrowserView - a folder that isn't there", () => {
  const TMP_PREFIX = "dG1wLw==" // "tmp/"

  const emptyListing = {
    data: { objects: [], folders: [], versions: [], isTruncated: false, nextContinuationToken: undefined },
    isLoading: false,
    error: null,
    trpc: {},
  } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>

  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSearch()
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)
  })

  it("reports a prefix that matches nothing as a missing folder, without the write actions", () => {
    resetMockSearch({ prefix: TMP_PREFIX })
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue(emptyListing)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getByText("Folder Not Found")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /back to bucket root/i })).toBeInTheDocument()
    // The toolbar is gone with the table: Upload and Create Folder write to the prefix, and
    // an invented one must not be turnable into a real folder.
    expect(screen.queryByTestId("objects-table")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /upload object/i })).not.toBeInTheDocument()
  })

  it("leaves an empty bucket root alone — there is no prefix to disprove", () => {
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue(emptyListing)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.queryByText("Folder Not Found")).not.toBeInTheDocument()
    expect(screen.getByTestId("objects-table")).toBeInTheDocument()
  })

  it("treats a folder holding only its own marker object as real", () => {
    resetMockSearch({ prefix: TMP_PREFIX })
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      // What `CreateFolderModal` leaves behind for an empty folder: a zero-byte key that is
      // the prefix itself. The rows filter it out, so only the raw response shows it.
      data: {
        objects: [{ key: "tmp/", size: 0, lastModified: "2024-01-15T10:30:00Z" }],
        folders: [],
        isTruncated: false,
        nextContinuationToken: undefined,
      },
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.queryByText("Folder Not Found")).not.toBeInTheDocument()
    expect(screen.getByTestId("objects-table")).toBeInTheDocument()
  })

  it("does not judge existence from the Deleted tab, which lists versions", () => {
    resetMockSearch({ prefix: TMP_PREFIX, tab: "deleted" })
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue(emptyListing)

    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.queryByText("Folder Not Found")).not.toBeInTheDocument()
    expect(screen.getByTestId("objects-table")).toBeInTheDocument()
  })
})
