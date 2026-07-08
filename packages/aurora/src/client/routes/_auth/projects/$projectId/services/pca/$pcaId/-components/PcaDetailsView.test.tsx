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

vi.mock("./-table/PcaCertificatesListContainer", () => ({
  PcaCertificatesListContainer: ({ pcaId, pcaState }: { pcaId: string; pcaState: string }) => (
    <div data-testid="pca-certificates-list">
      Certificates list for {pcaId} ({pcaState})
    </div>
  ),
}))

vi.mock("./-modals/IssueSelfSignedCertificateModal", () => ({
  IssueSelfSignedCertificateModal: ({ open }: { open: boolean }) => (open ? <div>Issue Self-Signed Modal</div> : null),
}))

vi.mock("./-modals/ImportExternallySignedCertificateModal", () => ({
  ImportExternallySignedCertificateModal: ({ open }: { open: boolean }) =>
    open ? <div>Import Externally Signed Modal</div> : null,
}))

describe("PcaDetailsView", () => {
  const basePca: CertificateAuthority = {
    id: "ca-1",
    project_id: "project-1",
    state: "READY",
    configuration: {
      subject: {
        named_attributes: {
          cn: "ca.example.internal",
        },
      },
    },
    csr: "-----BEGIN CSR-----",
    certificate: {
      pem: "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----",
      validity: {
        not_before: 1705315200,
        not_after: 1705488000,
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
    expect(screen.getByTestId("pca-certificates-list")).toBeInTheDocument()
    expect(screen.getByText("Certificates list for ca-1 (READY)")).toBeInTheDocument()
  })

  it("shows lifecycle action and opens self-signed modal for AWAITING_CERTIFICATE state", async () => {
    const user = userEvent.setup()
    renderView({
      ...basePca,
      state: "AWAITING_CERTIFICATE",
    })

    expect(screen.getByText("Lifecycle action")).toBeInTheDocument()
    expect(screen.getByText("Add a Signed Certificate to your CA to activate it")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Issue Self-Signed Certificate" }))
    expect(screen.getByText("Issue Self-Signed Modal")).toBeInTheDocument()
    expect(screen.getByText("Certificates list for ca-1 (AWAITING_CERTIFICATE)")).toBeInTheDocument()
  })

  it("opens import externally signed certificate modal for AWAITING_CERTIFICATE state", async () => {
    const user = userEvent.setup()
    renderView({
      ...basePca,
      state: "AWAITING_CERTIFICATE",
    })

    await user.click(screen.getByRole("button", { name: "Import Signed Certificate" }))
    expect(screen.getByText("Import Externally Signed Modal")).toBeInTheDocument()
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
