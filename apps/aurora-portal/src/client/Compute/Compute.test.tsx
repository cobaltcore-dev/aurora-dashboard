import { render, screen, waitFor } from "@testing-library/react"
import Compute from "./Compute"
import { trpcClient } from "../trpcClient"

describe("Compute Component", () => {
  const mockData = [
    { id: "1", name: "Server A" },
    { id: "2", name: "Server B" },
  ]

  const mockCompute = {
    ...trpcClient.compute,
    getServers: {
      query: vi.fn().mockResolvedValue({
        data: mockData,
      }),
    },
  }

  test("renders loading state initially", () => {
    mockCompute.getServers.query.mockImplementation(() => new Promise(() => {})) // Keeps loading
    render(<Compute api={mockCompute} />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  test("renders servers list when API succeeds", async () => {
    mockCompute.getServers.query.mockResolvedValue(mockData)

    render(<Compute api={mockCompute} />)

    // Wait for servers list to appear
    await waitFor(() => {
      expect(screen.getByText("Compute")).toBeInTheDocument()
      expect(screen.getByText("Server A")).toBeInTheDocument()
      expect(screen.getByText("Server B")).toBeInTheDocument()
    })
  })

  test("renders error state when API fails", async () => {
    const errorMessage = "Failed to fetch servers"
    mockCompute.getServers.query.mockRejectedValue(new Error(errorMessage))

    render(<Compute api={mockCompute} />)

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument()
    })
  })
})
