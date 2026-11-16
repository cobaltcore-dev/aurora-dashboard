import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { ReactNode } from "react"
import { BucketHeader } from "./BucketHeader"

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ projectId: "p1", provider: "ceph" }),
}))

vi.mock("../hooks/useBucketInfo", () => ({
  useBucketInfo: () => ({
    versioningStatus: undefined,
    policyData: undefined,
    hasOldVersionsOrDeleteMarkers: false,
  }),
}))

vi.mock("../hooks/useCephPermissions", () => ({
  useCephPermissions: () => ({
    permissions: {
      canUpdateVersioning: false,
      canUpdatePolicy: false,
      canDeletePolicy: false,
      canEmptyBucket: false,
      canDeleteBucket: false,
      canDeleteVersion: false,
    },
  }),
}))

vi.mock("./BucketModals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./BucketModals")>()
  return { ...actual, BucketModals: () => null }
})

vi.mock("./BucketDetailTabs", () => ({ BucketDetailTabs: () => null }))

vi.mock("@/client/components/ContentHeader/ContentHeader", () => ({
  ContentHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}))

vi.mock("../CliSetup/CliSetupModal", () => ({
  CliSetupModal: ({
    isOpen,
    bucketName,
    onOpenCredentials,
  }: {
    isOpen: boolean
    bucketName?: string
    onOpenCredentials: () => void
  }) =>
    isOpen ? (
      <div data-testid="cli-setup-modal">
        <span>{bucketName}</span>
        <button onClick={onOpenCredentials}>OpenCredentialsFromCliSetup</button>
      </div>
    ) : null,
}))

vi.mock("../Credentials/ManageCredentialsModal", () => ({
  ManageCredentialsModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="manage-credentials-modal" /> : null,
}))

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

describe("BucketHeader", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const openCliSetup = async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Bucket actions" }))
    await user.click(screen.getByText("CLI Setup"))
    return user
  }

  it("opens the CLI Setup guide with the bucket name from the always-visible menu", async () => {
    render(<BucketHeader bucketName="my-bucket" />, { wrapper: Wrapper })

    await openCliSetup()

    expect(screen.getByTestId("cli-setup-modal")).toHaveTextContent("my-bucket")
  })

  it("swaps the CLI Setup guide for Manage Credentials", async () => {
    render(<BucketHeader bucketName="my-bucket" />, { wrapper: Wrapper })

    const user = await openCliSetup()
    await user.click(screen.getByRole("button", { name: "OpenCredentialsFromCliSetup" }))

    expect(screen.queryByTestId("cli-setup-modal")).not.toBeInTheDocument()
    expect(screen.getByTestId("manage-credentials-modal")).toBeInTheDocument()
  })
})
