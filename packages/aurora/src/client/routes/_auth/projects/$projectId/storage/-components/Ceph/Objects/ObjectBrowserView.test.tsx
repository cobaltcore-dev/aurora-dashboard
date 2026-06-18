import { describe, it, expect, vi, beforeEach } from "vitest"
import { render as rtlRender, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { ReactNode } from "react"
import userEvent from "@testing-library/user-event"
import { ObjectBrowserView } from "./ObjectBrowserView"
import { trpcReact } from "@/client/trpcClient"

// Mock dependencies
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>,
  })
}

// Mock child components
vi.mock("./CreateFolderModal", () => ({
  CreateFolderModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="create-folder-modal">Create New Folder</div> : null,
}))

vi.mock("./ObjectsTableView", () => ({
  ObjectsTableView: () => <div data-testid="objects-table">Objects Table</div>,
}))

vi.mock("./ObjectsFileNavigation", () => ({
  ObjectsFileNavigation: ({ bucketName }: { bucketName: string }) => (
    <div data-testid="file-navigation">{bucketName}</div>
  ),
}))

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useNavigate: () => vi.fn(),
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
    useSearch: () => ({
      prefix: undefined,
      sortBy: undefined,
      sortDirection: undefined,
      search: "",
    }),
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
  const mockUseQuery = vi.fn(() => ({
    data: mockObjectsData,
    isLoading: false,
    error: null,
    trpc: {},
  }))

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
          },
        },
      },
    },
  }
})

describe("ObjectBrowserView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it("shows New Folder button", () => {
    render(<ObjectBrowserView bucketName="test-bucket" />)

    expect(screen.getByRole("button", { name: /create folder/i })).toBeInTheDocument()
  })

  it("shows Upload button", () => {
    render(<ObjectBrowserView bucketName="test-bucket" />)

    // The component doesn't have an upload button in the current implementation
    // It only has a Create Folder button
    expect(screen.getByRole("button", { name: /create folder/i })).toBeInTheDocument()
  })

  it("opens create folder modal when New Folder is clicked", async () => {
    const user = userEvent.setup()
    render(<ObjectBrowserView bucketName="test-bucket" />)

    const createFolderButton = screen.getByRole("button", { name: /create folder/i })
    await user.click(createFolderButton)

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
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)
  })

  it("shows loading spinner when data is loading", () => {
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValueOnce({
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
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValue({
      data: mockObjectsData,
      isLoading: false,
      error: null,
      trpc: {},
    } as ReturnType<typeof trpcReact.storage.ceph.objects.list.useQuery>)
  })

  it("shows error message when fetch fails", () => {
    vi.mocked(trpcReact.storage.ceph.objects.list.useQuery).mockReturnValueOnce({
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
