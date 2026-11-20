import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ClusterList } from "./ClusterList"
import { trpcReact } from "@/client/trpcClient"
import type { Cluster } from "@/server/Kubernetes/types/cluster"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { messages } from "@/locales/en/messages"

i18n.load("en", messages)
i18n.activate("en")

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

describe("ClusterList", () => {
  const renderWithProviders = (component: React.ReactElement) => {
    return render(<I18nProvider i18n={i18n}>{component}</I18nProvider>)
  }

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
    } as never)

    renderWithProviders(<ClusterList projectId="test-project" landscape="qa" />)

    // Check for column headers
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Readiness")).toBeInTheDocument()
    expect(screen.getByText("Last Operation")).toBeInTheDocument()
    expect(screen.getByText("Kubernetes Version")).toBeInTheDocument()

    // Check for cluster data
    expect(screen.getByText("test-cluster")).toBeInTheDocument()
    expect(screen.getByText("cluster-123")).toBeInTheDocument()
    expect(screen.getByText("4/5")).toBeInTheDocument()
    expect(screen.getByText("Cluster reconciled successfully")).toBeInTheDocument()
    expect(screen.getByText("1.28.0")).toBeInTheDocument()
  })
})
