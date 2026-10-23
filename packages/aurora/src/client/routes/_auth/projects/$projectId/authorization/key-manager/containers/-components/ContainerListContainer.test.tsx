import { cleanup, render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Container } from "@/server/KeyManager/types/keyManager"
import { ContainerListContainer } from "./ContainerListContainer"

vi.mock("./ContainerTableRow", () => ({
  ContainerTableRow: ({ container }: { container: Container }) => (
    <div role="row" data-testid={`container-row-${container.container_ref}`}>
      {container.name}
    </div>
  ),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const makeContainer = (ref: string, name: string): Container => ({
  container_ref: ref,
  name,
  type: "generic",
  status: "ACTIVE",
  created: "2026-01-10T08:00:00Z",
  updated: "2026-01-10T08:00:00Z",
  secret_refs: [],
})

const mockContainers = [makeContainer("container-1", "tls-bundle"), makeContainer("container-2", "rsa-pair")]

const defaultProps = {
  isLoading: false,
  isError: false,
  error: null,
  canDelete: true,
  onShowDetails: vi.fn(),
  onDelete: vi.fn(),
}

describe("ContainerListContainer", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Columns", () => {
    it("renders the column headers in spec order (status right after the primary column)", () => {
      render(<ContainerListContainer containers={mockContainers} {...defaultProps} />, { wrapper: TestWrapper })

      const headers = screen.getAllByRole("columnheader")
      // Name / ID, Status, Type, actions
      expect(headers).toHaveLength(4)
      expect(headers[0]).toHaveTextContent("Name / ID")
      expect(headers[1]).toHaveTextContent("Status")
      expect(headers[2]).toHaveTextContent("Type")
    })
  })

  describe("Data state", () => {
    it("renders a row for each container", () => {
      render(<ContainerListContainer containers={mockContainers} {...defaultProps} />, { wrapper: TestWrapper })

      expect(screen.getByTestId("container-row-container-1")).toBeInTheDocument()
      expect(screen.getByTestId("container-row-container-2")).toBeInTheDocument()
      expect(screen.getAllByRole("row")).toHaveLength(3) // header + 2 data rows
    })
  })

  describe("Loading state", () => {
    it("renders a progress status while loading", () => {
      render(<ContainerListContainer containers={[]} {...defaultProps} isLoading />, { wrapper: TestWrapper })

      expect(screen.getByText("Loading Containers...")).toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    it("renders the error message when the request failed", () => {
      render(<ContainerListContainer containers={[]} {...defaultProps} isError error={{ message: "Boom" }} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("Boom")).toBeInTheDocument()
    })

    it("falls back to a generic error message", () => {
      render(<ContainerListContainer containers={[]} {...defaultProps} isError error={null} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("Failed to Load Containers")).toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("renders the empty state when there are no containers", () => {
      render(<ContainerListContainer containers={[]} {...defaultProps} />, { wrapper: TestWrapper })

      expect(screen.getByText("No Containers Found")).toBeInTheDocument()
    })
  })
})
