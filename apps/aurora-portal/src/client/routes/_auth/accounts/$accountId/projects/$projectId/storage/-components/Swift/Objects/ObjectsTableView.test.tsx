import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ObjectsTableView } from "./ObjectsTableView"
import type { BrowserRow } from "./"

// ─── Mock virtualizer ─────────────────────────────────────────────────────────
// useVirtualizer doesn't work in jsdom (no layout engine), so we render all
// items directly by mocking getVirtualItems to return every row.

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 48,
        size: 48,
        key: i,
        measureElement: vi.fn(),
      })),
    getTotalSize: () => count * 48,
    measureElement: vi.fn(),
  }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeFolder = (name: string): BrowserRow => ({
  kind: "folder",
  name: `${name}/`,
  displayName: name,
})

const makeObject = (name: string, overrides: Partial<Extract<BrowserRow, { kind: "object" }>> = {}): BrowserRow => ({
  kind: "object",
  name,
  displayName: name,
  bytes: 1024,
  last_modified: "2024-03-01T08:00:00.000000",
  content_type: "text/plain",
  ...overrides,
})

const mockRows: BrowserRow[] = [
  makeFolder("documents"),
  makeFolder("images"),
  makeObject("readme.txt"),
  makeObject("photo.png", { bytes: 204800, content_type: "image/png" }),
]

// ─── Render helper ────────────────────────────────────────────────────────────

const renderView = ({
  rows = mockRows,
  searchTerm = "",
  onFolderClick = vi.fn(),
}: {
  rows?: BrowserRow[]
  searchTerm?: string
  onFolderClick?: (prefix: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ObjectsTableView rows={rows} searchTerm={searchTerm} onFolderClick={onFolderClick} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ObjectsTableView", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Empty state", () => {
    test("renders empty state when rows array is empty and no search term", () => {
      renderView({ rows: [] })
      expect(screen.getByText(/This folder is empty/i)).toBeInTheDocument()
    })

    test("renders no-match message when rows are empty and search term is set", () => {
      renderView({ rows: [], searchTerm: "xyz" })
      expect(screen.getByText(/No objects match your search/i)).toBeInTheDocument()
    })

    test("does not render table header in empty state", () => {
      renderView({ rows: [] })
      expect(screen.queryByTestId("objects-table-header")).not.toBeInTheDocument()
    })
  })

  describe("Table structure", () => {
    test("renders table header when rows exist", () => {
      renderView()
      expect(screen.getByTestId("objects-table-header")).toBeInTheDocument()
    })

    test("renders all column headers", () => {
      renderView()
      expect(screen.getByRole("columnheader", { name: "Object Name" })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: "Last Modified" })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: "Size" })).toBeInTheDocument()
    })

    test("renders table body", () => {
      renderView()
      expect(screen.getByTestId("objects-table-body")).toBeInTheDocument()
    })
  })

  describe("Row rendering", () => {
    test("renders a row for each item", () => {
      renderView()
      mockRows.forEach((row) => {
        expect(screen.getByTestId(`object-row-${row.name}`)).toBeInTheDocument()
      })
    })

    test("renders folder display names", () => {
      renderView()
      expect(screen.getByText("documents")).toBeInTheDocument()
      expect(screen.getByText("images")).toBeInTheDocument()
    })

    test("renders object display names", () => {
      renderView()
      expect(screen.getByText("readme.txt")).toBeInTheDocument()
      expect(screen.getByText("photo.png")).toBeInTheDocument()
    })

    test("renders — for last modified on folder rows", () => {
      renderView({ rows: [makeFolder("docs")] })
      const row = screen.getByTestId("object-row-docs/")
      expect(row).toHaveTextContent("—")
    })

    test("renders — for size on folder rows", () => {
      renderView({ rows: [makeFolder("docs")] })
      const row = screen.getByTestId("object-row-docs/")
      // Both last-modified and size cells show — for folders
      expect(row.textContent?.match(/—/g)?.length).toBeGreaterThanOrEqual(2)
    })

    test("renders formatted size for object rows", () => {
      // 1024 bytes = 1 KiB
      renderView({ rows: [makeObject("file.txt", { bytes: 1024 })] })
      expect(screen.getByText(/1(\s*)KiB/i)).toBeInTheDocument()
    })

    test("renders N/A for missing last_modified on objects", () => {
      renderView({ rows: [makeObject("file.txt", { last_modified: undefined })] })
      const row = screen.getByTestId("object-row-file.txt")
      expect(row).toHaveTextContent("—")
    })
  })

  describe("Folder navigation", () => {
    test("folder rows render as clickable buttons", () => {
      renderView()
      expect(screen.getByTestId("folder-documents/")).toBeInTheDocument()
    })

    test("clicking a folder row calls onFolderClick with the full prefix", async () => {
      const user = userEvent.setup()
      const onFolderClick = vi.fn()
      renderView({ onFolderClick })
      await user.click(screen.getByTestId("folder-documents/"))
      expect(onFolderClick).toHaveBeenCalledWith("documents/")
    })

    test("object rows do not render as buttons", () => {
      renderView({ rows: [makeObject("readme.txt")] })
      expect(screen.queryByTestId("folder-readme.txt")).not.toBeInTheDocument()
    })
  })

  describe("Footer", () => {
    test("shows item count in footer", () => {
      renderView()
      expect(screen.getByText(/Showing/i)).toBeInTheDocument()
      expect(screen.getByText(/4 items/i)).toBeInTheDocument()
    })

    test("footer total matches rows length", () => {
      renderView({ rows: [makeObject("a.txt"), makeObject("b.txt")] })
      expect(screen.getByText(/2 items/i)).toBeInTheDocument()
    })
  })
})
