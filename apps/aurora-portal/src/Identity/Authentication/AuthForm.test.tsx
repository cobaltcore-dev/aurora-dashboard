import { render, screen } from "@testing-library/react"
import { MockedProvider } from "@apollo/client/testing"
import { describe, it, expect } from "vitest"
import { AuthForm } from "./AuthForm"
import { AuthenticationDocument } from "../../generated/graphql"
// @ts-expect-error types will be provided soon
import { PortalProvider } from "@cloudoperators/juno-ui-components"

const mocks = [
  {
    request: {
      query: AuthenticationDocument,
      variables: {
        domain: "aurora",
        username: "test",
        password: "test",
      },
    },
    result: {
      data: {
        login: {
          user: {
            id: "1",
            name: "Astro Kitty",
          },
        },
      },
    },
  },
]

describe("App Component", () => {
  it("renders AuthForm correctly", () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <PortalProvider>
          <AuthForm opened onSuccess={() => null} onCancel={() => null} />
        </PortalProvider>
      </MockedProvider>
    )

    expect(screen.getByText(/Domain/i)).toBeInTheDocument()
    expect(screen.getByText(/User/i)).toBeInTheDocument()
    expect(screen.getByText(/Password/i)).toBeInTheDocument()
  })
})
