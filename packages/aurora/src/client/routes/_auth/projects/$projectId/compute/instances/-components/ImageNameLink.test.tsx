import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { ReactNode } from "react"
import { ImageNameLink } from "./ImageNameLink"

// Mutable query result returned by the mocked getImageById query.
let queryResult: { data: unknown; status: string } = { data: undefined, status: "pending" }

vi.mock("@/client/trpcClient", () => ({
  trpcReact: { compute: { getImageById: { useQuery: () => queryResult } } },
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a data-testid="image-link">{children}</a>,
}))

const renderIt = () => render(<ImageNameLink imageId="img-123" projectId="p1" />)

describe("ImageNameLink", () => {
  it("links the resolved name once the image resolves", () => {
    queryResult = { data: { id: "img-123", name: "ubuntu-22.04" }, status: "success" }
    renderIt()
    expect(screen.getByTestId("image-link")).toHaveTextContent("ubuntu-22.04")
  })

  // Loading and inaccessible (error) collapse to the same branch: no name, so "- -".
  it.each(["pending", "error"])("shows '- -' (no link, no id) when the query is %s", (status) => {
    queryResult = { data: undefined, status }
    renderIt()
    expect(screen.getByText("- -")).toBeInTheDocument()
    expect(screen.queryByTestId("image-link")).not.toBeInTheDocument()
    expect(screen.queryByText("img-123")).not.toBeInTheDocument()
  })
})
