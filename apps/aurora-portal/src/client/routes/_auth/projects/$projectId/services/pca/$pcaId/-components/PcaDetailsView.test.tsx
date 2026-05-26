import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { CertificateAuthority } from "@/server/Services/types/pca"
import { PcaDetailsView } from "./PcaDetailsView"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "project-1",
}))

vi.mock("../../-components/-modals/DeletePcaModal", () => ({
  DeletePcaModal: ({ open, onSuccess }: { open: boolean; onSuccess?: () => void }) =>
    open ? (
      <div>
        <div>Delete CA Modal</div>
        <button onClick={onSuccess}>Trigger Delete Success</button>
      </div>
    ) : null,
}))

describe("PcaDetailsView", () => {
  const basePca: CertificateAuthority = {
    id: "ca-1",
    project_id: "project-1",
    state: "READY",
    configuration: {
      subject: {
        common_name: "ca.example.internal",
      },
    },
    csr: "-----BEGIN CSR-----",
    certificate: {
      pem: "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----",
      validity: {
        not_before: 1,
        not_after: 1 + 2 * 24 * 60 * 60 * 1000,
      },
    },
  }

  const renderView = (pca: CertificateAuthority = basePca) =>
    render(
      <I18nProvider i18n={i18n}>
        <PcaDetailsView pca={pca} />
      </I18nProvider>
    )

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders basic details content", () => {
    renderView()

    expect(screen.getByText("ca.example.internal Certificate Authority Details")).toBeInTheDocument()
    expect(screen.getByText("Manage your Private Certificate Authority infrastructure")).toBeInTheDocument()
    expect(screen.getByText("CA ID")).toBeInTheDocument()
    expect(screen.getByText("ca-1")).toBeInTheDocument()
    expect(screen.getByText("2 days")).toBeInTheDocument()
  })

  it("opens delete modal from details page", async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole("button", { name: "Delete Certificate Authority" }))

    expect(screen.getByText("Delete CA Modal")).toBeInTheDocument()
  })

  it("navigates to list page after delete success", async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole("button", { name: "Delete Certificate Authority" }))
    await user.click(screen.getByRole("button", { name: "Trigger Delete Success" }))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/services/pca",
      params: { projectId: "project-1" },
    })
  })
})
