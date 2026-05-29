import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, expect, it, vi } from "vitest"
import type { CertificateAuthority } from "@/server/Services/types/pca"
import { PcaTableRow } from "./PcaTableRow"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "project-1",
}))

vi.mock("../-modals/DeletePcaModal", () => ({
  DeletePcaModal: ({ open }: { open: boolean }) => (open ? <div>Delete CA Modal</div> : null),
}))

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

  it("navigates to details page when row is clicked", async () => {
    const user = userEvent.setup()
    renderRow(basePca)

    await user.click(screen.getByTestId("pca-row-pca-123"))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/services/pca/$pcaId",
      params: { projectId: "project-1", pcaId: "pca-123" },
    })
  })

  it("opens Delete CA modal when Delete CA is clicked", async () => {
    const user = userEvent.setup()
    renderRow(basePca)

    await user.click(screen.getByRole("button", { name: "More" }))
    await user.click(screen.getByRole("menuitem", { name: "Delete CA" }))

    expect(screen.getByText("Delete CA Modal")).toBeInTheDocument()
  })
})
