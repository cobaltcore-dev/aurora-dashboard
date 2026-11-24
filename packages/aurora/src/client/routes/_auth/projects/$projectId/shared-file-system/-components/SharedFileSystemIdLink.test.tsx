import { cleanup, render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { SharedFileSystemIdLink } from "./SharedFileSystemIdLink"

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

describe("SharedFileSystemIdLink", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders a link to the share detail for target=share", () => {
    render(<SharedFileSystemIdLink target="share" id="share-123" projectId="proj-1" />, { wrapper: TestWrapper })

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/projects/proj-1/shared-file-system/share-123")
    expect(link).toHaveTextContent("share-123")
  })

  it("renders a link to the share network detail for target=shareNetwork", () => {
    render(<SharedFileSystemIdLink target="shareNetwork" id="sharenet-456" projectId="proj-1" />, {
      wrapper: TestWrapper,
    })

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/projects/proj-1/shared-file-system/share-networks/sharenet-456")
    expect(link).toHaveTextContent("sharenet-456")
  })

  it("renders a link to the snapshot detail for target=snapshot", () => {
    render(<SharedFileSystemIdLink target="snapshot" id="snapshot-789" projectId="proj-1" />, { wrapper: TestWrapper })

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/projects/proj-1/shared-file-system/snapshots/snapshot-789")
    expect(link).toHaveTextContent("snapshot-789")
  })

  it("renders a link to the network detail for target=network", () => {
    render(<SharedFileSystemIdLink target="network" id="net-abc" projectId="proj-1" />, { wrapper: TestWrapper })

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/projects/proj-1/network/networks/net-abc")
    expect(link).toHaveTextContent("net-abc")
  })

  it("truncates a 36-character UUID and shows the copy button outside the link", () => {
    const uuid = "12345678-1234-1234-1234-123456789abc"
    render(<SharedFileSystemIdLink target="share" id={uuid} projectId="proj-1" />, { wrapper: TestWrapper })

    const link = screen.getByRole("link")
    expect(link).toHaveTextContent("12345678-1234...")

    const button = screen.getByRole("button", {
      name: new RegExp(`copy ${uuid.replace(/-/g, "\\-")} to clipboard`, "i"),
    })
    expect(button).toBeInTheDocument()
    expect(link).not.toContainElement(button)
  })

  it("renders a short ID (≤13 characters) untruncated", () => {
    render(<SharedFileSystemIdLink target="share" id="short-id" projectId="proj-1" />, { wrapper: TestWrapper })

    const link = screen.getByRole("link")
    expect(link).toHaveTextContent("short-id")
    expect(link.textContent).not.toContain("...")
  })

  it("renders plain ID with no link when linkable=false", () => {
    render(<SharedFileSystemIdLink target="share" id="share-999" projectId="proj-1" linkable={false} />, {
      wrapper: TestWrapper,
    })

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.getByText("share-999")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /copy share-999 to clipboard/i })).toBeInTheDocument()
  })
})
