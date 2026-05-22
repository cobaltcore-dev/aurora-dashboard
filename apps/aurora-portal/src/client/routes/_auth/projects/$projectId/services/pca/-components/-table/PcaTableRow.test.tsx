import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, expect, it } from "vitest"
import type { CertificateAuthority } from "@/server/Services/types/pca"
import { PcaTableRow } from "./PcaTableRow"

describe("PcaTableRow", () => {
  const basePca: CertificateAuthority = {
    id: "pca-123",
    project_id: "project-1",
    state: "CREATING",
    configuration: {
      subject: {
        common_name: "example.internal",
      },
    },
  }

  const renderRow = (pca: CertificateAuthority) =>
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <PcaTableRow pca={pca} />
        </PortalProvider>
      </I18nProvider>
    )

  it("renders row id, state text, and subject", () => {
    renderRow(basePca)

    expect(screen.getByTestId("pca-row-pca-123")).toBeInTheDocument()
    expect(screen.getByText("CREATING")).toBeInTheDocument()
    expect(screen.getByText("pca-123")).toBeInTheDocument()
    expect(screen.getByText("example.internal")).toBeInTheDocument()
  })

  it("renders em dash when common_name is empty", () => {
    renderRow({
      ...basePca,
      configuration: {
        subject: {
          common_name: "",
        },
      },
    })

    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("shows disabled Delete CA action", async () => {
    const user = userEvent.setup()
    renderRow(basePca)

    await user.click(screen.getByRole("button", { name: "More" }))

    expect(screen.getByRole("menuitem", { name: "Delete CA" })).toHaveAttribute("aria-disabled", "true")
  })
})
