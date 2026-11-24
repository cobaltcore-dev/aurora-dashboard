import { cleanup, render, screen } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { type ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { ShareSnapshot } from "@/server/SharedFileSystem/types/snapshot"
import { ShareSnapshotDetailsView } from "./ShareSnapshotDetailsView"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string
    params: Record<string, string>
    children: ReactNode
    className?: string
  }) => {
    const href = Object.entries(params ?? {}).reduce((acc, [k, v]) => acc.replace(`$${k}`, v), to)
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  },
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

describe("ShareSnapshotDetailsView", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
  })

  it("renders all fields when fully populated", () => {
    const snapshot: ShareSnapshot = {
      id: "snap-123",
      name: "my-snapshot",
      status: "available",
      size: 10,
      share_proto: "nfs",
      description: "Test snapshot",
      created_at: "2026-01-02T03:04:05.000000",
      share_id: "share-456",
      updated_at: null,
      project_id: null,
      share_size: null,
    }

    render(<ShareSnapshotDetailsView snapshot={snapshot} projectId="proj-1" />, { wrapper: TestWrapper })

    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("my-snapshot")).toBeInTheDocument()
    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByText("snap-123")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    // StatusLabel renders the raw value; CSS capitalizes it, which jsdom doesn't apply
    expect(screen.getByText("available")).toBeInTheDocument()
    expect(screen.getByText("Size (GiB)")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("Protocol")).toBeInTheDocument()
    expect(screen.getByText("NFS")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(screen.getByText("Test snapshot")).toBeInTheDocument()
    expect(screen.getByText("Created")).toBeInTheDocument()
    // The date is shown via toLocaleString()
    const createdDate = new Date("2026-01-02T03:04:05.000000Z")
    expect(screen.getByText(createdDate.toLocaleString())).toBeInTheDocument()
    expect(screen.getByText("Source Share")).toBeInTheDocument()
    expect(screen.getByText("share-456")).toBeInTheDocument()
  })

  it("renders - - for all missing fields except ID", () => {
    const snapshot: ShareSnapshot = {
      id: "snap-123",
      name: null,
      status: null,
      size: null,
      share_proto: null,
      description: null,
      created_at: null,
      share_id: null,
      updated_at: null,
      project_id: null,
      share_size: null,
    }

    render(<ShareSnapshotDetailsView snapshot={snapshot} projectId="proj-1" />, { wrapper: TestWrapper })

    // ID is always shown
    expect(screen.getByText("snap-123")).toBeInTheDocument()

    // 7 fields should show - - (Name, Status, Size, Protocol, Description, Created, Source Share)
    expect(screen.getAllByText("- -")).toHaveLength(7)

    // No link when share_id is null
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("renders 0 when size is 0", () => {
    const snapshot: ShareSnapshot = {
      id: "snap-123",
      name: null,
      status: null,
      size: 0,
      share_proto: null,
      description: null,
      created_at: null,
      share_id: null,
      updated_at: null,
      project_id: null,
      share_size: null,
    }

    render(<ShareSnapshotDetailsView snapshot={snapshot} projectId="proj-1" />, { wrapper: TestWrapper })

    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("renders - - when created_at is unparsable", () => {
    const snapshot: ShareSnapshot = {
      id: "snap-123",
      name: null,
      status: null,
      size: null,
      share_proto: null,
      description: null,
      created_at: "not-a-date",
      share_id: null,
      updated_at: null,
      project_id: null,
      share_size: null,
    }

    render(<ShareSnapshotDetailsView snapshot={snapshot} projectId="proj-1" />, { wrapper: TestWrapper })

    expect(screen.getByText("Created")).toBeInTheDocument()
    // The unparsable date shows as - -
    expect(screen.getAllByText("- -")).toContainEqual(expect.anything())
  })

  it("links Source Share to the share detail", () => {
    const snapshot: ShareSnapshot = {
      id: "snap-123",
      name: null,
      status: null,
      size: null,
      share_proto: null,
      description: null,
      created_at: null,
      share_id: "share-456",
      updated_at: null,
      project_id: null,
      share_size: null,
    }

    render(<ShareSnapshotDetailsView snapshot={snapshot} projectId="proj-1" />, { wrapper: TestWrapper })

    const link = screen.getByRole("link", { name: "share-456" })
    expect(link).toHaveAttribute("href", "/projects/proj-1/shared-file-system/share-456")
    expect(screen.getByRole("button", { name: /copy share-456 to clipboard/i })).toBeInTheDocument()
  })

  it("renders unknown protocol as raw value", () => {
    const snapshot: ShareSnapshot = {
      id: "snap-123",
      name: null,
      status: null,
      size: null,
      share_proto: "weirdfs",
      description: null,
      created_at: null,
      share_id: null,
      updated_at: null,
      project_id: null,
      share_size: null,
    }

    render(<ShareSnapshotDetailsView snapshot={snapshot} projectId="proj-1" />, { wrapper: TestWrapper })

    expect(screen.getByText("weirdfs")).toBeInTheDocument()
  })
})
