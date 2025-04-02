import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { ProjectsOverview } from "./ProjectsOverview"
import { describe, it, expect, vi } from "vitest"
import { TrpcClient } from "../trpcClient"
import { AuroraProvider } from "../Shell/AuroraProvider"
import { Router } from "wouter"

const mockGetProjects = vi.fn()

const mockClient = {
  project: { getAuthProjects: { query: mockGetProjects }, getProjectById: { query: mockGetProjects } },
} as unknown as TrpcClient

// Helper function to wrap components with AuthProvider & Router
const renderWithAuth = (ui: React.ReactNode) => {
  return render(
    <AuroraProvider>
      <Router>{ui}</Router>
    </AuroraProvider>
  )
}

describe("ProjectsOverview Component", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("renders loading state", async () => {
    mockGetProjects.mockReturnValue(new Promise(() => {})) // Never resolves

    renderWithAuth(<ProjectsOverview client={mockClient.project} />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("filters projects based on search term", async () => {
    const mockProjects = [
      { id: "1", name: "Project Alpha", enabled: true },
      { id: "2", name: "Test Project", enabled: true },
    ]

    const mockClient = {
      getAuthProjects: {
        query: vi.fn().mockResolvedValue(mockProjects),
      },
      getProjectById: { query: mockGetProjects },
    }

    renderWithAuth(<ProjectsOverview client={mockClient} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Search...")
    fireEvent.change(searchInput, { target: { value: "Test" } })

    await waitFor(() => {
      expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument()
      expect(screen.getByText("Test Project")).toBeInTheDocument()
    })
  })
})
