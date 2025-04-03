import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { ProjectRescope } from "./ProjectRescope"
import { AuroraContext, AuroraContextType } from "../Shell/AuroraProvider"
import { vi } from "vitest"
import { createRoutePaths } from "../routes/AuroraRoutes"
import { TrpcClient } from "../trpcClient"

const mockSetCurrentScope = {
  getCurrentUserSession: vi.fn(),
  getAuthToken: vi.fn(),
  getCurrentScope: vi.fn(),
  setCurrentScope: {
    mutate: vi.fn(() => Promise.resolve({ domain: { id: "domain-1" }, project: { id: "project-1" } })),
  },
} as unknown as TrpcClient["auth"]

describe("ProjectRescope", () => {
  let contextValue: AuroraContextType

  beforeEach(() => {
    contextValue = {
      currentScope: undefined,
      setCurrentScope: vi.fn(),
      domain: { id: "default-domain", name: "Default Domain" },
      auroraRoutes: createRoutePaths().auroraRoutePaths(),
      setAuroraRoutes: vi.fn(),
      setDomain: vi.fn(),
    }
  })

  test("calls setCurrentScope.mutate when projectId or domainId change", async () => {
    render(
      <AuroraContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={["/domain-1/project-1"]}>
          <ProjectRescope client={mockSetCurrentScope}>
            <div>Content Loaded</div>
          </ProjectRescope>
        </MemoryRouter>
      </AuroraContext.Provider>
    )

    expect(screen.getByText("Content Loaded")).toBeInTheDocument()
  })

  test("shows loading state when rescoping", async () => {
    contextValue.currentScope = {
      scope: {
        domain: { id: "domain-1", name: "default" },
        project: {
          id: "project-1",
          name: "cool-project",
          enabled: false,
        },
      },
      isLoading: true,
      error: undefined,
    }

    render(
      <AuroraContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={["/domain-1/project-1"]}>
          <ProjectRescope client={mockSetCurrentScope}>
            <div>Content Loaded</div>
          </ProjectRescope>
        </MemoryRouter>
      </AuroraContext.Provider>
    )

    expect(screen.getByText("Rescoping...")).toBeInTheDocument()
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
        project: {
          id: "project-1",
          name: "cool-project",
          enabled: false,
        },
      },
      isLoading: false,
      error: "Scope failed",
    }

    render(
      <AuroraContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={["/domain-1/project-1"]}>
          <ProjectRescope client={mockSetCurrentScope}>
            <div>Content Loaded</div>
          </ProjectRescope>
        </MemoryRouter>
      </AuroraContext.Provider>
    )

    await waitFor(() => {
      expect(screen.getByText("Error: Scope failed")).toBeInTheDocument()
    })
  })
})
