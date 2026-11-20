import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ClusterList } from "./ClusterList"
import { trpcReact } from "@/client/trpcClient"
import type { Cluster } from "@/server/Kubernetes/types/cluster"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { messages } from "@/locales/en/messages"

i18n.load("en", messages)
i18n.activate("en")

// Mock TanStack Router
const mockNavigate = vi.fn()
const mockUseSearch = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockUseSearch(),
}))

// Mock the tRPC client
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    kubernetes: {
      getPermissions: {
        useQuery: vi.fn(),
      },
      clusters: {
        list: {
          useQuery: vi.fn(),
        },
      },
    },
    useUtils: vi.fn(() => ({
      kubernetes: {
        clusters: {
          list: {
            invalidate: vi.fn(),
          },
        },
      },
    })),
  },
}))

const mockCluster: Cluster = {
  uid: "cluster-123",
  name: "test-cluster",
  namespace: "test-namespace",
  isDeleted: false,
  status: "healthy",
  version: "1.28.0",
  versionUpdates: null,
  readiness: {
    status: "4/5",
    conditions: [],
  },
  lastOperationSummary: "Cluster reconciled successfully",
  addOns: [],
  labels: {},
  lastErrors: [],
  workers: [],
  maintenance: {
    startTime: "00:00",
    endTime: "01:00",
    timezone: "+00:00",
  },
  lastMaintenance: {},
  autoUpdate: {
    os: false,
    kubernetes: false,
  },
}

const mockCluster2: Cluster = {
  ...mockCluster,
  uid: "cluster-456",
  name: "another-cluster",
  status: "progressing",
  version: "1.27.0",
}

const mockCluster3: Cluster = {
  ...mockCluster,
  uid: "cluster-789",
  name: "unhealthy-cluster",
  status: "unhealthy",
  version: "1.29.0",
}

describe("ClusterList", () => {
  const renderWithProviders = (component: React.ReactElement) => {
    return render(<I18nProvider i18n={i18n}>{component}</I18nProvider>)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSearch.mockReturnValue({})
  })

  it("renders loading state while permissions are loading", () => {
    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)
    expect(screen.getByText(/Loading clusters/i)).toBeInTheDocument()
  })

  it("renders loading state while clusters are loading", () => {
    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)
    expect(screen.getByText(/Loading clusters/i)).toBeInTheDocument()
  })

  it("renders error state when permissions fail to load", () => {
    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "Failed to fetch permissions" },
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)
    expect(screen.getByText(/Failed to load permissions/i)).toBeInTheDocument()
    expect(screen.getByText(/Failed to fetch permissions/i)).toBeInTheDocument()
  })

  it("renders access denied state when user lacks permission", () => {
    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: false, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument()
    expect(screen.getByText(/You do not have permission to list clusters/i)).toBeInTheDocument()
  })

  it("renders error state when clusters query fails", () => {
    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "Failed to fetch clusters" },
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)
    expect(screen.getByText(/Failed to load clusters/i)).toBeInTheDocument()
    expect(screen.getByText(/Failed to fetch clusters/i)).toBeInTheDocument()
  })

  it("renders empty state when no clusters exist", () => {
    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)
    expect(screen.getByText(/No clusters/i)).toBeInTheDocument()
    expect(screen.getByText(/There are no Kubernetes clusters in this project/i)).toBeInTheDocument()
  })

  it("renders DataGrid with clusters when data is available", () => {
    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: [mockCluster],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)

    // Check for cluster data
    expect(screen.getByText("test-cluster")).toBeInTheDocument()
    expect(screen.getByText("cluster-123")).toBeInTheDocument()
    expect(screen.getByText("4/5")).toBeInTheDocument()
    expect(screen.getByText("Cluster reconciled successfully")).toBeInTheDocument()
    expect(screen.getByText("1.28.0")).toBeInTheDocument()
  })

  it("filters clusters by status", () => {
    mockUseSearch.mockReturnValue({ status: "healthy" })

    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: [mockCluster, mockCluster2, mockCluster3],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)

    // Should show only healthy cluster
    expect(screen.getByText("test-cluster")).toBeInTheDocument()
    expect(screen.queryByText("another-cluster")).not.toBeInTheDocument()
    expect(screen.queryByText("unhealthy-cluster")).not.toBeInTheDocument()
  })

  it("searches clusters by name and uid", () => {
    mockUseSearch.mockReturnValue({ search: "another" })

    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: [mockCluster, mockCluster2, mockCluster3],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)

    // Should show only the cluster matching "another"
    expect(screen.getByText("another-cluster")).toBeInTheDocument()
    expect(screen.queryByText("test-cluster")).not.toBeInTheDocument()
    expect(screen.queryByText("unhealthy-cluster")).not.toBeInTheDocument()
  })

  it("sorts clusters by name ascending", () => {
    mockUseSearch.mockReturnValue({ sortBy: "name", sortDirection: "asc" })

    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: [mockCluster, mockCluster2, mockCluster3],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    } as never)

    const { container } = renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)

    // Get all cluster names in order they appear
    const clusterNames = Array.from(container.querySelectorAll("div.flex.flex-col > span:first-child")).map(
      (el) => el.textContent
    )

    // Should be sorted alphabetically
    expect(clusterNames).toEqual(["another-cluster", "test-cluster", "unhealthy-cluster"])
  })

  it("sorts clusters by name descending", () => {
    mockUseSearch.mockReturnValue({ sortBy: "name", sortDirection: "desc" })

    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: [mockCluster, mockCluster2, mockCluster3],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    } as never)

    const { container } = renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)

    // Get all cluster names in order they appear
    const clusterNames = Array.from(container.querySelectorAll("div.flex.flex-col > span:first-child")).map(
      (el) => el.textContent
    )

    // Should be sorted reverse alphabetically
    expect(clusterNames).toEqual(["unhealthy-cluster", "test-cluster", "another-cluster"])
  })

  it("renders Create Cluster button", () => {
    mockUseSearch.mockReturnValue({})

    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: [mockCluster],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)

    const createButton = screen.getByText("Create Cluster")
    expect(createButton).toBeInTheDocument()
  })

  it("shows empty filtered state when no matches", () => {
    mockUseSearch.mockReturnValue({ status: "healthy" })

    vi.mocked(trpcReact.kubernetes.getPermissions.useQuery).mockReturnValue({
      data: { clusters: { list: true, create: false, update: false, delete: false } },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    // Return only non-healthy clusters
    vi.mocked(trpcReact.kubernetes.clusters.list.useQuery).mockReturnValue({
      data: [mockCluster2, mockCluster3],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)

    expect(screen.getByText("No matches")).toBeInTheDocument()
    expect(screen.getByText(/No clusters match your current filters/i)).toBeInTheDocument()
  })
})
