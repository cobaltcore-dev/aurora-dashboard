import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MockedProvider } from "@apollo/client/testing"
import { describe, it, expect } from "vitest"
import App from "./App"
import { GetTokenDocument, AuthenticationDocument, LogoutDocument } from "../generated/graphql"

const mocks = [
  {
    request: {
      query: GetTokenDocument,
    },
    result: {
      data: {
        token: null,
      },
    },
  },
  {
    request: {
      query: GetTokenDocument,
    },
    result: {
      data: {
        token: {
          user: {
            name: "John Doe",
            id: "1",
            domain: {
              name: "example.com",
            },
          },
          project: {
            name: "Project Name",
          },
          domain: {
            name: "example.com",
          },
          expiresAt: "2023-12-31T23:59:59Z",
        },
      },
    },
  },
  {
    request: {
      query: AuthenticationDocument,
    },
    result: {
      data: {
        authenticate: {
          success: true,
        },
      },
    },
  },
  {
    request: {
      query: LogoutDocument,
    },
    result: {
      data: {
        logout: true,
      },
    },
  },
]

describe("App Component", () => {
  it("renders loading state initially", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <App />
      </MockedProvider>
    )

    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("renders sign in button when not authenticated", async () => {
    render(
      <MockedProvider mocks={[mocks[0]]} addTypename={false}>
        <App />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Sign in to get started")).toBeInTheDocument()
      expect(screen.getAllByRole("button", { name: /sign in/i })).toHaveLength(2)
    })
  })

  it("renders user name and logout button when authenticated", async () => {
    render(
      <MockedProvider mocks={[mocks[1]]} addTypename={false}>
        <App />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Hello John Doe")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument()
    })
  })

  it("calls logout and refetch on logout button click", async () => {
    render(
      <MockedProvider mocks={[mocks[1], mocks[3], mocks[0]]} addTypename={false}>
        <App />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Hello John Doe")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /Logout/i }))

    await waitFor(() => {
      expect(screen.getByText("Sign in to get started")).toBeInTheDocument()
    })
  })
})
