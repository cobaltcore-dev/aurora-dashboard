import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, within } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { SecurityServiceDetailsView } from "./SecurityServiceDetailsView"

describe("SecurityServiceDetailsView", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
  })

  const renderComponent = (securityService: SecurityService) =>
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <SecurityServiceDetailsView securityService={securityService} />
        </PortalProvider>
      </I18nProvider>
    )

  it("renders all 12 labels in the correct order", () => {
    const service: SecurityService = {
      id: "sec-123",
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

    renderComponent(service)

    const labels = screen.getAllByRole("term")
    expect(labels).toHaveLength(12)
    expect(labels[0]).toHaveTextContent("Name")
    expect(labels[1]).toHaveTextContent("ID")
    expect(labels[2]).toHaveTextContent("Type")
    expect(labels[3]).toHaveTextContent("Status")
    expect(labels[4]).toHaveTextContent("DNS IP")
    expect(labels[5]).toHaveTextContent("Server")
    expect(labels[6]).toHaveTextContent("Domain")
    expect(labels[7]).toHaveTextContent("User")
    expect(labels[8]).toHaveTextContent("Organizational Unit")
    expect(labels[9]).toHaveTextContent("Description")
    expect(labels[10]).toHaveTextContent("Created")
    expect(labels[11]).toHaveTextContent("Updated")
  })

  it("renders a fully populated security service", () => {
    const service: SecurityService = {
      id: "sec-123",
      name: "My LDAP Service",
      type: "active_directory",
      status: "active",
      dns_ip: "10.0.0.1",
      server: "ad.example.com",
      domain: "example.com",
      user: "admin",
      ou: "IT Department",
      description: "Corporate AD",
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-16T12:00:00Z",
      project_id: null,
    }

    renderComponent(service)

    expect(screen.getByText("My LDAP Service")).toBeInTheDocument()
    expect(screen.getByText("sec-123")).toBeInTheDocument()
    expect(screen.getByText("Active Directory")).toBeInTheDocument()
    expect(screen.getByText("active")).toBeInTheDocument()
    expect(screen.getByText("10.0.0.1")).toBeInTheDocument()
    expect(screen.getByText("ad.example.com")).toBeInTheDocument()
    expect(screen.getByText("example.com")).toBeInTheDocument()
    expect(screen.getByText("admin")).toBeInTheDocument()
    expect(screen.getByText("IT Department")).toBeInTheDocument()
    expect(screen.getByText("Corporate AD")).toBeInTheDocument()
    // Date format includes time, so we just check the date portion is present
    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument()
    expect(screen.getByText(/1\/16\/2024/)).toBeInTheDocument()
  })

  it("renders - - for all missing values except ID", () => {
    const service: SecurityService = {
      id: "sec-123",
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

    renderComponent(service)

    const definitions = screen.getAllByRole("definition")
    // Name, Type, Status, DNS IP, Server, Domain, User, OU, Description, Created, Updated
    // should all show - -. Only ID shows the actual ID.
    const emptyValues = definitions.filter((def) => within(def).queryByText("- -"))
    expect(emptyValues.length).toBeGreaterThanOrEqual(11)

    // ID should not be - -
    expect(screen.getByText("sec-123")).toBeInTheDocument()
  })

  it("does not render password label or value even when cast to include it", () => {
    const service = {
      id: "sec-123",
      name: "Service",
      type: "ldap",
      status: "active",
      project_id: null,
      user: null,
      dns_ip: null,
      ou: null,
      domain: null,
      server: null,
      description: null,
      created_at: null,
      updated_at: null,
      password: "s3cret-value",
    } as SecurityService

    renderComponent(service)

    expect(screen.queryByText("s3cret-value")).not.toBeInTheDocument()
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument()
  })
})
