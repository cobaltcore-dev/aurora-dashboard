import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { ReactNode } from "react"
import { BucketHeaderActions } from "./BucketHeaderActions"

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

describe("BucketHeaderActions", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const defaultProps = {
    versioningStatus: { status: "Suspended" as const },
    hasPolicy: true,
    hasOldVersionsOrDeleteMarkers: true,
    isBucketEmpty: false,
    onOpenModal: vi.fn(),
    canUpdateVersioning: true,
    canUpdatePolicy: true,
    canDeletePolicy: true,
    canEmptyBucket: true,
    canDeleteBucket: true,
    canDeleteVersions: true,
  }

  const openMenu = async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Bucket actions" }))
  }

  it("shows every permitted item when all permissions are granted", async () => {
    render(<BucketHeaderActions {...defaultProps} />, { wrapper: Wrapper })
    expect(screen.getByRole("button", { name: "Bucket actions" })).toBeInTheDocument()
    await openMenu()

    expect(screen.getByText("Enable Versioning")).toBeInTheDocument()
    expect(screen.getByText("Edit Policy")).toBeInTheDocument()
    expect(screen.getByText("Delete Policy")).toBeInTheDocument()
    expect(screen.getByText("Empty Bucket")).toBeInTheDocument()
    expect(screen.getByText("Delete Versions")).toBeInTheDocument()
    expect(screen.getByText("Delete Bucket")).toBeInTheDocument()
  })

  it("renders nothing when all six permissions are false", () => {
    render(
      <BucketHeaderActions
        {...defaultProps}
        canUpdateVersioning={false}
        canUpdatePolicy={false}
        canDeletePolicy={false}
        canEmptyBucket={false}
        canDeleteBucket={false}
        canDeleteVersions={false}
      />,
      { wrapper: Wrapper }
    )

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("hides Enable/Suspend Versioning when canUpdateVersioning is false", async () => {
    render(<BucketHeaderActions {...defaultProps} canUpdateVersioning={false} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.queryByText("Enable Versioning")).not.toBeInTheDocument()
    expect(screen.queryByText("Suspend Versioning")).not.toBeInTheDocument()
    expect(screen.getByText("Edit Policy")).toBeInTheDocument()
  })

  it("hides Edit/Add Policy when canUpdatePolicy is false", async () => {
    render(<BucketHeaderActions {...defaultProps} canUpdatePolicy={false} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.queryByText("Edit Policy")).not.toBeInTheDocument()
    expect(screen.queryByText("Add Policy")).not.toBeInTheDocument()
    expect(screen.getByText("Delete Policy")).toBeInTheDocument()
  })

  it("hides Delete Policy when canDeletePolicy is false", async () => {
    render(<BucketHeaderActions {...defaultProps} canDeletePolicy={false} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.queryByText("Delete Policy")).not.toBeInTheDocument()
    expect(screen.getByText("Edit Policy")).toBeInTheDocument()
  })

  it("hides Empty Bucket when canEmptyBucket is false", async () => {
    render(<BucketHeaderActions {...defaultProps} canEmptyBucket={false} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.queryByText("Empty Bucket")).not.toBeInTheDocument()
    expect(screen.getByText("Delete Bucket")).toBeInTheDocument()
  })

  it("hides Delete Bucket when canDeleteBucket is false", async () => {
    render(<BucketHeaderActions {...defaultProps} canDeleteBucket={false} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.queryByText("Delete Bucket")).not.toBeInTheDocument()
    expect(screen.getByText("Empty Bucket")).toBeInTheDocument()
  })

  it("hides Delete Versions when canDeleteVersions is false", async () => {
    render(<BucketHeaderActions {...defaultProps} canDeleteVersions={false} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.queryByText("Delete Versions")).not.toBeInTheDocument()
    expect(screen.getByText("Delete Bucket")).toBeInTheDocument()
  })

  it("shows Enable Versioning (not Suspend) when versioningStatus is Unversioned", async () => {
    render(<BucketHeaderActions {...defaultProps} versioningStatus={{ status: "Unversioned" }} />, {
      wrapper: Wrapper,
    })
    await openMenu()

    expect(screen.getByText("Enable Versioning")).toBeInTheDocument()
    expect(screen.queryByText("Suspend Versioning")).not.toBeInTheDocument()
  })

  it("shows Suspend Versioning (not Enable) when versioningStatus is Enabled", async () => {
    render(<BucketHeaderActions {...defaultProps} versioningStatus={{ status: "Enabled" }} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.getByText("Suspend Versioning")).toBeInTheDocument()
    expect(screen.queryByText("Enable Versioning")).not.toBeInTheDocument()
  })

  it("renders neither versioning item when versioningStatus is undefined", async () => {
    render(<BucketHeaderActions {...defaultProps} versioningStatus={undefined} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.queryByText("Enable Versioning")).not.toBeInTheDocument()
    expect(screen.queryByText("Suspend Versioning")).not.toBeInTheDocument()
    // Other items are still available, so the menu itself still renders.
    expect(screen.getByText("Edit Policy")).toBeInTheDocument()
  })

  it("shows Add Policy (not Delete Policy) when hasPolicy is false", async () => {
    render(<BucketHeaderActions {...defaultProps} hasPolicy={false} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.getByText("Add Policy")).toBeInTheDocument()
    expect(screen.queryByText("Delete Policy")).not.toBeInTheDocument()
  })

  it("hides Empty Bucket when isBucketEmpty is true", async () => {
    render(<BucketHeaderActions {...defaultProps} isBucketEmpty={true} />, { wrapper: Wrapper })
    await openMenu()

    expect(screen.queryByText("Empty Bucket")).not.toBeInTheDocument()
    expect(screen.getByText("Delete Bucket")).toBeInTheDocument()
  })
})
