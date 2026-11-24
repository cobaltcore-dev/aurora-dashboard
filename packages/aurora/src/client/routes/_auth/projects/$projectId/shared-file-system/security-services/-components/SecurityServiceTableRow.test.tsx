import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { SecurityServiceTableRow } from "./SecurityServiceTableRow"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const mockSecurityServiceFull: SecurityService = {
  id: "sec-123",
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

const mockSecurityServiceMinimal: SecurityService = {
  id: "sec-456",
  type: null,
  status: null,
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

const renderComponent = (securityService: SecurityService = mockSecurityServiceFull) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <SecurityServiceTableRow securityService={securityService} />
      </PortalProvider>
    </I18nProvider>
  )

const cells = (serviceId: string) =>
  within(screen.getByTestId(`security-service-row-${serviceId}`)).getAllByRole("gridcell")

describe("SecurityServiceTableRow", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders cells in the correct order: Status, Name/ID, Type, DNS IP, Server, Created, Actions", () => {
      renderComponent()

      const [status, nameId, type, dnsIp, server, created, actions] = cells("sec-123")

      expect(status).toHaveTextContent("active")
      expect(within(nameId).getByText("my-security-service")).toBeInTheDocument()
      expect(within(nameId).getByText("sec-123")).toBeInTheDocument()
      expect(type).toHaveTextContent("LDAP")
      expect(dnsIp).toHaveTextContent("10.0.0.1")
      expect(server).toHaveTextContent("ldap.example.com")
      expect(created).toHaveTextContent("1/15/2024")
      expect(within(actions).getByRole("button", { name: /more/i })).toBeInTheDocument()
    })

    it("renders status as raw text with capitalization handled by CSS", () => {
      renderComponent({ ...mockSecurityServiceFull, status: "error" })

      const [status] = cells("sec-123")
      expect(status).toHaveTextContent("error")
      expect(status.querySelector(".lowercase.first-letter\\:uppercase")).toBeInTheDocument()
    })

    it("renders only the ID when name is missing", () => {
      renderComponent(mockSecurityServiceMinimal)

      const [, nameId] = cells("sec-456")
      expect(within(nameId).getAllByText("sec-456")).toHaveLength(1)
      expect(within(nameId).getByRole("button", { name: /copy sec-456 to clipboard/i })).toBeInTheDocument()
    })

    it("renders an unknown type as its raw value", () => {
      renderComponent({ ...mockSecurityServiceFull, type: "custom-type" })

      const [, , type] = cells("sec-123")
      expect(type).toHaveTextContent("custom-type")
    })

    it("renders - - for missing type", () => {
      renderComponent(mockSecurityServiceMinimal)

      const [, , type] = cells("sec-456")
      expect(type).toHaveTextContent("- -")
    })

    it("renders - - for missing dns_ip", () => {
      renderComponent(mockSecurityServiceMinimal)

      const [, , , dnsIp] = cells("sec-456")
      expect(dnsIp).toHaveTextContent("- -")
    })

    it("renders - - for missing server", () => {
      renderComponent(mockSecurityServiceMinimal)

      const [, , , , server] = cells("sec-456")
      expect(server).toHaveTextContent("- -")
    })

    it("renders - - for missing created_at", () => {
      renderComponent(mockSecurityServiceMinimal)

      const [, , , , , created] = cells("sec-456")
      expect(created).toHaveTextContent("- -")
    })

    it("does not render password even when cast to include it", () => {
      const withPassword = { ...mockSecurityServiceFull, password: "s3cret-value" } as SecurityService

      renderComponent(withPassword)

      expect(screen.queryByText("s3cret-value")).not.toBeInTheDocument()
    })
  })

  describe("Navigation", () => {
    it("navigates to detail page on row click", async () => {
      const user = userEvent.setup()
      renderComponent()

      const row = screen.getByTestId("security-service-row-sec-123")
      await user.click(row)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/security-services/$securityServiceId",
        params: { projectId: "proj-1", securityServiceId: "sec-123" },
      })
    })

    it("does not navigate when clicking the clipboard copy icon", async () => {
      const user = userEvent.setup()
      renderComponent()

      const copyButton = screen.getByTestId("clipboard-copy-trigger")
      await user.click(copyButton)

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe("Overflow menu", () => {
    it("contains Show Details as the first and only item", async () => {
      const user = userEvent.setup()
      renderComponent()

      const menuButton = screen.getByRole("button", { name: /more/i })
      await user.click(menuButton)

      const menuItems = screen.getAllByRole("menuitem")
      expect(menuItems).toHaveLength(1)
      expect(menuItems[0]).toHaveTextContent("Show Details")
    })

    it("navigates to detail page when Show Details is clicked", async () => {
      const user = userEvent.setup()
      renderComponent()

      const menuButton = screen.getByRole("button", { name: /more/i })
      await user.click(menuButton)

      const showDetailsItem = screen.getByRole("menuitem", { name: "Show Details" })
      await user.click(showDetailsItem)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/security-services/$securityServiceId",
        params: { projectId: "proj-1", securityServiceId: "sec-123" },
      })
    })
  })
})
