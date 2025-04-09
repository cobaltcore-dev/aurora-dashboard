import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { DomainRescope } from "./DomainRescope"
import { AuroraContext, AuroraContextType } from "../Shell/AuroraProvider"
import { vi } from "vitest"
import { TrpcClient } from "../trpcClient"

const mockSetCurrentScope = {
  getCurrentUserSession: vi.fn(),
  getAuthToken: vi.fn(),
  getCurrentScope: vi.fn(),
  setCurrentScope: {
    mutate: vi.fn(() => Promise.resolve({ domain: { id: "domain-1" } })),
  },
} as unknown as TrpcClient["auth"]

describe("DomainRescope", () => {
  let contextValue: AuroraContextType

  beforeEach(() => {
    contextValue = {
      currentScope: undefined,
      setCurrentScope: vi.fn(),
    }
  })

  test("calls setCurrentScope.mutate when domainId change", async () => {
    render(
      <AuroraContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={["/domain-1/projects"]}>
          <DomainRescope client={mockSetCurrentScope}>
            <div>Content Loaded</div>
          </DomainRescope>
        </MemoryRouter>
      </AuroraContext.Provider>
    )

    expect(screen.getByText("Content Loaded")).toBeInTheDocument()
  })

  test("shows loading state when rescoping", async () => {
    contextValue.currentScope = {
      scope: {
        domain: { id: "domain-1", name: "default" },
      },
      isLoading: true,
      error: undefined,
    }

    render(
      <AuroraContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={["/domain-1/projects"]}>
          <DomainRescope client={mockSetCurrentScope}>
            <div>Content Loaded</div>
          </DomainRescope>
        </MemoryRouter>
      </AuroraContext.Provider>
    )

    expect(screen.getByText("Rescoping domain...")).toBeInTheDocument()
  })

  test("shows error message if rescoping fails", async () => {
    const mockSetCurrentScope = {
      getCurrentUserSession: vi.fn(),
      getAuthToken: vi.fn(),
      getCurrentScope: vi.fn(),
      setCurrentScope: {
        mutate: vi.fn(() => Promise.reject(new Error("Scope update failed"))),
      },
    } as unknown as TrpcClient["auth"]

    contextValue.currentScope = {
      scope: {
        domain: { id: "domain-1", name: "default" },
      },
      isLoading: false,
      error: "Scope failed",
    }

    render(
      <AuroraContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={["/domain-1/projects"]}>
          <DomainRescope client={mockSetCurrentScope}>
            <div>Content Loaded</div>
          </DomainRescope>
        </MemoryRouter>
      </AuroraContext.Provider>
    )

    await waitFor(() => {
      expect(screen.getByText("Error: Scope failed")).toBeInTheDocument()
    })
  })
})
