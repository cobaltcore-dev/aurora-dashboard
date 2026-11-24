import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { ShareNetworkSecurityServicesTable } from "./ShareNetworkSecurityServicesTable"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockSecurityService: SecurityService = {
  id: "sec-123",
  name: "My Security Service",
  type: "active_directory",
  status: "new",
  project_id: null,
  user: null,
  dns_ip: null,
  ou: null,
  domain: null,
  server: null,
  description: null,
  created_at: null,
  updated_at: null,
}

const renderComponent = (props: {
  securityServices?: SecurityService[]
  isLoading?: boolean
  error?: { message?: string; data?: { code?: string } | null } | null
  canList?: boolean
  onRetry?: () => void
}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ShareNetworkSecurityServicesTable
          securityServices={props.securityServices ?? []}
          isLoading={props.isLoading ?? false}
          error={props.error ?? null}
          canList={props.canList ?? true}
          onRetry={props.onRetry ?? vi.fn()}
        />
      </PortalProvider>
    </I18nProvider>
  )

describe("ShareNetworkSecurityServicesTable", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the 3 column headers in the correct order", () => {
    renderComponent({})

    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(3)
    expect(headers[0]).toHaveTextContent("Name / ID")
    expect(headers[1]).toHaveTextContent("Type")
    expect(headers[2]).toHaveTextContent("") // Actions column
  })

  it("renders Access Denied when canList is false", () => {
    renderComponent({ canList: false })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(
      screen.getByText("You don't have permission to view the security services of this share network.")
    ).toBeInTheDocument()
  })

  it("renders Access Denied on FORBIDDEN error even with data", () => {
    const error = { data: { code: "FORBIDDEN" } }
    renderComponent({ error, securityServices: [mockSecurityService] })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.queryByText("My Security Service")).not.toBeInTheDocument()
  })

  it("renders loading state", () => {
    renderComponent({ isLoading: true })

    expect(screen.getByText("Loading Security Services...")).toBeInTheDocument()
  })

  it("renders UNAUTHORIZED error without Try Again button", () => {
    const error = { data: { code: "UNAUTHORIZED" } }
    renderComponent({ error })

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Your session has expired. Sign in again to view security services.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders error state with Try Again button", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const error = { message: "Network error", data: { code: "INTERNAL_SERVER_ERROR" } }

    renderComponent({ error, onRetry })

    expect(screen.getByText("Failed to Load Security Services")).toBeInTheDocument()
    expect(screen.getByText("The security services could not be loaded.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("does not render raw error.message", () => {
    const error = { message: "boom", data: { code: "INTERNAL_SERVER_ERROR" } }
    renderComponent({ error })

    expect(screen.queryByText("boom")).not.toBeInTheDocument()
  })

  it("renders empty state when no services", () => {
    renderComponent({ securityServices: [] })

    expect(screen.getByText("No Security Services")).toBeInTheDocument()
    expect(screen.getByText("This share network has no security services.")).toBeInTheDocument()
  })

  it("renders a security service with name and type", () => {
    renderComponent({ securityServices: [mockSecurityService] })

    expect(screen.getByText("My Security Service")).toBeInTheDocument()
    expect(screen.getByText("sec-123")).toBeInTheDocument()
    expect(screen.getByText("Active Directory")).toBeInTheDocument()
  })

  it("renders type as Active Directory for active_directory", () => {
    renderComponent({ securityServices: [mockSecurityService] })

    expect(screen.getByText("Active Directory")).toBeInTheDocument()
  })

  it("renders an unknown type as-is", () => {
    const unknownService = { ...mockSecurityService, type: "unknown_type" }
    renderComponent({ securityServices: [unknownService] })

    expect(screen.getByText("unknown_type")).toBeInTheDocument()
  })

  it("navigates to security service detail on row click", async () => {
    const user = userEvent.setup()
    renderComponent({ securityServices: [mockSecurityService] })

    const row = screen.getByTestId("share-network-security-service-row-sec-123")
    await user.click(row)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/shared-file-system/security-services/$securityServiceId",
      params: { projectId: "proj-1", securityServiceId: "sec-123" },
    })
  })

  it("navigates to security service detail via Show Details", async () => {
    const user = userEvent.setup()
    renderComponent({ securityServices: [mockSecurityService] })

    const menuButton = screen.getByRole("button", { name: /more/i })
    await user.click(menuButton)

    const showDetailsItem = screen.getByRole("menuitem", { name: /show details/i })
    await user.click(showDetailsItem)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/shared-file-system/security-services/$securityServiceId",
      params: { projectId: "proj-1", securityServiceId: "sec-123" },
    })
  })
})
