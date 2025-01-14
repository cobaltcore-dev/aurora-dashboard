import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import Compute from "./Compute"
import { trpc } from "../trpcClient"

test("renders servers list", () => {
  const mockData = [
    { id: "1", name: "Server A" },
    { id: "2", name: "Server B" },
  ]

  const mockCompute = {
    ...trpc.compute,
    getServers: {
      useQuery: vi.fn().mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      }),
      useSuspenseQuery: vi.fn().mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      }),
    },
  }

  render(<Compute computeApi={mockCompute} />)

  // Assertions
  expect(screen.getByText("Compute")).toBeInTheDocument()
  expect(screen.getByText("Server A")).toBeInTheDocument()
  expect(screen.getByText("Server B")).toBeInTheDocument()
})
