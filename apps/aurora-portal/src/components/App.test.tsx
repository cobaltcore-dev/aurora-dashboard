import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { MockedProvider } from "@apollo/client/testing"
import { describe, it, expect } from "vitest"
import App from "./App"
import { GetTracksDocument } from "../generated/graphql"
const mocks = [
  {
    request: {
      query: GetTracksDocument,
    },
    result: {
      data: {
        tracksForHome: [
          {
            id: "1",
            title: "Astro Kitty, Space Explorer",
            author: { name: "Grumpy Cat", photo: "photo_url" },
            thumbnail: "thumbnail_url",
            length: 1210,
            modulesCount: 6,
          },
        ],
      },
    },
  },
]

describe("App Component", () => {
  it("renders AppShellProvider and AppShell correctly", async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App />
      </MockedProvider>
    )
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument()

    // Wait for the data to appear
    await waitFor(() => {
      expect(screen.getByText(/Astro Kitty, Space Explorer/i)).toBeInTheDocument()
    })
  })
})
