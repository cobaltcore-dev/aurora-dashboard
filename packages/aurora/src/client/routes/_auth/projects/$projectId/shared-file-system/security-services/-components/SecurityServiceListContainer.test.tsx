import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { SecurityServiceListContainer } from "./SecurityServiceListContainer"

// Mock router and hooks
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockSecurityService: SecurityService = {
  id: "sec-1",
  name: "my-security-service",
  type: "ldap",
  status: "active",
  dns_ip: "10.0.0.1",
  server: "ldap.example.com",
  created_at: "2024-01-15T10:30:00Z",
  project_id: null,
  user: null,
  ou: null,
  domain: null,
  description: null,
  updated_at: null,
}

const renderComponent = (props: {
  securityServices?: SecurityService[]
  isLoading?: boolean
  error?: { code?: string } | null
  isFiltered?: boolean
  onRetry?: () => void
}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <SecurityServiceListContainer
          securityServices={props.securityServices ?? []}
          isLoading={props.isLoading ?? false}
          error={props.error ?? null}
          isFiltered={props.isFiltered ?? false}
          onRetry={props.onRetry ?? vi.fn()}
        />
      </PortalProvider>
    </I18nProvider>
  )

describe("SecurityServiceListContainer", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the 7 column headers in the correct order", () => {
    renderComponent({ securityServices: [] })

    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(7)
    expect(headers[0]).toHaveTextContent("Status")
    expect(headers[1]).toHaveTextContent("Name / ID")
    expect(headers[2]).toHaveTextContent("Type")
    expect(headers[3]).toHaveTextContent("DNS IP")
    expect(headers[4]).toHaveTextContent("Server")
    expect(headers[5]).toHaveTextContent("Created")
    expect(headers[6]).toHaveTextContent("") // Actions column
  })

  it("renders a loading state", () => {
    renderComponent({ isLoading: true })

    expect(screen.getByText("Loading Security Services...")).toBeInTheDocument()
  })

  it("renders an error state with Try Again button", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    renderComponent({
      error: { code: "INTERNAL_SERVER_ERROR" },
      onRetry,
    })

    expect(screen.getByText("Failed to Load Security Services")).toBeInTheDocument()
    expect(screen.getByText("The security services could not be loaded.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders UNAUTHORIZED error without Try Again button", () => {
    renderComponent({
      error: { code: "UNAUTHORIZED" },
    })

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Your session has expired. Sign in again to view security services.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("does not render raw error message text", () => {
    renderComponent({
      error: { code: "INTERNAL_SERVER_ERROR" },
    })

    expect(screen.queryByText("INTERNAL_SERVER_ERROR")).not.toBeInTheDocument()
  })

  it("renders empty state when no services and not filtered", () => {
    renderComponent({ securityServices: [], isFiltered: false })

    expect(screen.getByText("No Security Services Found")).toBeInTheDocument()
    expect(screen.getByText("No security services in this project")).toBeInTheDocument()
  })

  it("renders filtered-empty state when no services and filtered", () => {
    renderComponent({ securityServices: [], isFiltered: true })

    expect(screen.getByText("No Matching Security Services")).toBeInTheDocument()
    expect(screen.getByText("No security services match your filters")).toBeInTheDocument()
  })

  it("renders service rows when data is provided", () => {
    renderComponent({
      securityServices: [mockSecurityService, { ...mockSecurityService, id: "sec-2", name: "another" }],
    })

    expect(screen.getByTestId("security-service-row-sec-1")).toBeInTheDocument()
    expect(screen.getByTestId("security-service-row-sec-2")).toBeInTheDocument()
  })
})
