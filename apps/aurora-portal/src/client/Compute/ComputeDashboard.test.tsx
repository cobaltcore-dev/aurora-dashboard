import { describe, it, vi, beforeEach, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { ComputeDashboard } from "./ComputeDashboard"
import { TrpcClient } from "../trpcClient"
import { MemoryRouter, Route, Routes } from "react-router-dom"

// Create more complete mock client based on the error
const mockClient = {
  compute: {
    getServersByProjectId: {
      query: vi.fn().mockResolvedValue([]),
    },
    getImagesByProjectId: {
      query: vi.fn().mockResolvedValue([]),
    },
    getKeypairsByProjectId: {
      query: vi.fn().mockResolvedValue([]),
    },
    getServerGroupsByProjectId: {
      query: vi.fn().mockResolvedValue([]),
    },
  },
  project: {
    getProjectById: {
      query: vi.fn().mockResolvedValue({ id: "test-project", name: "Test Project" }),
    },
  },
} as unknown as TrpcClient

// Helper function to wrap components with providers
const renderWithProviders = (ui: React.ReactNode, initialPath = "/projects/test-project") => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/projects/:project/*" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

describe("ComputeDashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("renders the compute dashboard", async () => {
    renderWithProviders(<ComputeDashboard client={mockClient} />)

    await waitFor(() => {
      expect(screen.getByText("Compute")).toBeInTheDocument()
    })
  })

  it("renders the overview component by default", async () => {
    // Ensure the mocked client returns data
    mockClient.compute.getServersByProjectId.query = vi.fn().mockResolvedValue([
      {
        id: "test-server-id",
        name: "Test Server",
        status: "ACTIVE",
      },
    ])

    renderWithProviders(<ComputeDashboard client={mockClient} />)

    // The Overview component should call these methods
    await waitFor(() => {
      expect(mockClient.compute.getServersByProjectId.query).toHaveBeenCalled()
      expect(mockClient.compute.getImagesByProjectId.query).toHaveBeenCalled()
    })
  })

  it("renders instances component when on instances route", async () => {
    renderWithProviders(<ComputeDashboard client={mockClient} />, "/projects/test-project/instances")

    await waitFor(() => {
      expect(mockClient.compute.getServersByProjectId.query).toHaveBeenCalled()
    })
  })

  it("renders no project selected message when project is not provided", async () => {
    // Use renderWithProviders directly but override the route path
    render(
      <MemoryRouter initialEntries={["/projects/"]}>
        <Routes>
          <Route path="/projects/" element={<ComputeDashboard client={mockClient} />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("No project selected")).toBeInTheDocument()
    })
  })
})
