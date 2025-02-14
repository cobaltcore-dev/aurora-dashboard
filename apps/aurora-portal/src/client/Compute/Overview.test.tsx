import { render, screen, waitFor } from "@testing-library/react"
import { Overview } from "./Overview"
import { trpcClient } from "../trpcClient"

describe("Overview Component", () => {
  const mockData = [
    { id: "1", name: "Server A" },
    { id: "2", name: "Server B" },
  ]

  const mockOverview = {
    ...trpcClient.compute,
    getServers: {
      query: vi.fn().mockResolvedValue({
        data: mockData,
      }),
    },
  }

  test("renders loading state initially", () => {
    mockOverview.getServers.query.mockImplementation(() => new Promise(() => {})) // Keeps loading
    render(<Overview client={mockOverview} />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  test("renders servers list when API succeeds", async () => {
    mockOverview.getServers.query.mockResolvedValue(mockData)

    render(<Overview client={mockOverview} />)

    // Wait for servers list to appear
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument()
      expect(screen.getByText("Server A")).toBeInTheDocument()
      expect(screen.getByText("Server B")).toBeInTheDocument()
    })
  })

  test("renders error state when API fails", async () => {
    const errorMessage = "Failed to fetch servers"
    mockOverview.getServers.query.mockRejectedValue(new Error(errorMessage))

    render(<Overview client={mockOverview} />)

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument()
    })
  })
})
