import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, expect, it } from "vitest"
import type { Certificate } from "@/server/Services/types/pca"
import { PcaCertificatesTableRow } from "./PcaCertificatesTableRow"

const baseCertificate: Certificate = {
  id: "cert-123",
  certificate_authority_id: "ca-456",
  project_id: "project-1",
}

const renderRow = (certificate: Certificate) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <PcaCertificatesTableRow certificate={certificate} />
      </PortalProvider>
    </I18nProvider>
  )

describe("PcaCertificatesTableRow", () => {
  it("renders row with correct data-testid", () => {
    renderRow(baseCertificate)

    expect(screen.getByTestId("pca-certificate-row-cert-123")).toBeInTheDocument()
  })

  it("renders certificate_authority_id", () => {
    renderRow(baseCertificate)

    expect(screen.getByText("ca-456")).toBeInTheDocument()
  })

  it("renders certificate id", () => {
    renderRow(baseCertificate)

    expect(screen.getByText("cert-123")).toBeInTheDocument()
  })

  it("renders disabled Create Certificate menu item", async () => {
    const user = userEvent.setup()
    renderRow(baseCertificate)

    await user.click(screen.getByRole("button", { name: "More" }))

    const menuItem = screen.getByRole("menuitem", { name: "Create Certificate" })
    expect(menuItem).toBeInTheDocument()
    expect(menuItem).toHaveAttribute("aria-disabled", "true")
  })
})
