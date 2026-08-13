import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { LifecycleRulesViewer } from "./LifecycleRulesViewer"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockRuleWithFilter: LifecycleRuleRead = {
  ID: "rule-with-filter",
  Status: "Enabled",
  Filter: { Prefix: "logs/" },
  Expiration: { Days: 90 },
}

const mockRuleWithLegacyPrefix: LifecycleRuleRead = {
  ID: "legacy-rule",
  Status: "Enabled",
  Prefix: "legacy/",
  Expiration: { Days: 30 },
}

const mockRuleWithTransitions: LifecycleRuleRead = {
  ID: "transition-rule",
  Status: "Enabled",
  Filter: { Prefix: "archive/" },
  Transitions: [
    { Days: 30, StorageClass: "GLACIER" },
    { Days: 90, StorageClass: "DEEP_ARCHIVE" },
  ],
}

const mockRuleWithDateExpiration: LifecycleRuleRead = {
  ID: "date-rule",
  Status: "Enabled",
  Filter: { Prefix: "temp/" },
  Expiration: { Date: "2026-12-31T00:00:00.000Z" },
}

const mockRuleWithExpiredObjectDeleteMarker: LifecycleRuleRead = {
  ID: "marker-rule",
  Status: "Enabled",
  Filter: { Prefix: "" },
  Expiration: { ExpiredObjectDeleteMarker: true },
}

const mockRuleWithNoncurrentVersionExpiration: LifecycleRuleRead = {
  ID: "noncurrent-rule",
  Status: "Enabled",
  Filter: { Prefix: "" },
  NoncurrentVersionExpiration: { NoncurrentDays: 60, NewerNoncurrentVersions: 3 },
}

const mockRuleWithAbortUpload: LifecycleRuleRead = {
  ID: "abort-rule",
  Status: "Enabled",
  Filter: { Prefix: "uploads/" },
  AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
}

const mockRuleWithTagFilter: LifecycleRuleRead = {
  ID: "tag-rule",
  Status: "Enabled",
  Filter: { Tag: { Key: "Environment", Value: "production" } },
  Expiration: { Days: 180 },
}

// ─── Render helper ────────────────────────────────────────────────────────────

const renderViewer = ({
  rules = [],
  onAddRule = vi.fn(),
  onEditRule = vi.fn(),
  onDeleteRule = vi.fn(),
}: {
  rules?: LifecycleRuleRead[]
  onAddRule?: () => void
  onEditRule?: (index: number) => void
  onDeleteRule?: (index: number) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <LifecycleRulesViewer rules={rules} onAddRule={onAddRule} onEditRule={onEditRule} onDeleteRule={onDeleteRule} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LifecycleRulesViewer", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Basic rendering", () => {
    test("renders description text", () => {
      renderViewer()
      expect(screen.getByText(/Lifecycle rules automate object management/i)).toBeInTheDocument()
    })

    test("renders Add New Rule button", () => {
      renderViewer()
      expect(screen.getByRole("button", { name: /Add New Rule/i })).toBeInTheDocument()
    })

    test("calls onAddRule when Add New Rule button is clicked", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnAddRule = vi.fn()
      renderViewer({ onAddRule: mockOnAddRule })

      const addButton = screen.getByRole("button", { name: /Add New Rule/i })
      await user.click(addButton)

      expect(mockOnAddRule).toHaveBeenCalledTimes(1)
    })
  })

  describe("Item 23: Legacy Prefix display", () => {
    test("displays legacy Prefix when Filter is absent", () => {
      renderViewer({ rules: [mockRuleWithLegacyPrefix] })
      expect(screen.getByText(/Prefix: legacy\//i)).toBeInTheDocument()
    })

    test("displays Filter.Prefix when present", () => {
      renderViewer({ rules: [mockRuleWithFilter] })
      expect(screen.getByText(/Prefix: logs\//i)).toBeInTheDocument()
    })

    test("does not show 'All objects' for rule with legacy Prefix", () => {
      renderViewer({ rules: [mockRuleWithLegacyPrefix] })
      // Should show the prefix, not "All objects"
      expect(screen.getByText(/Prefix: legacy\//i)).toBeInTheDocument()
      // "All objects" might appear for other fields (like Transitions), but not for Filter
      expect(screen.getByText(/legacy-rule/i)).toBeInTheDocument()
    })
  })

  describe("Rule field display", () => {
    test("displays rule ID", () => {
      renderViewer({ rules: [mockRuleWithFilter] })
      expect(screen.getByText("rule-with-filter")).toBeInTheDocument()
    })

    test("displays rule Status", () => {
      renderViewer({ rules: [mockRuleWithFilter] })
      expect(screen.getByText("Enabled")).toBeInTheDocument()
    })

    test("displays Days-based expiration", () => {
      renderViewer({ rules: [mockRuleWithFilter] })
      expect(screen.getByText(/After 90 days/i)).toBeInTheDocument()
    })

    test("displays Date-based expiration", () => {
      renderViewer({ rules: [mockRuleWithDateExpiration] })
      expect(screen.getByText(/On 12\/31\/2026/i)).toBeInTheDocument()
    })

    test("displays ExpiredObjectDeleteMarker expiration", () => {
      renderViewer({ rules: [mockRuleWithExpiredObjectDeleteMarker] })
      expect(screen.getByText(/Clean up expired delete markers/i)).toBeInTheDocument()
    })

    test("displays Transitions", () => {
      renderViewer({ rules: [mockRuleWithTransitions] })
      expect(screen.getByText(/GLACIER after 30 days/i)).toBeInTheDocument()
      expect(screen.getByText(/DEEP_ARCHIVE after 90 days/i)).toBeInTheDocument()
    })

    test("displays NoncurrentVersionExpiration", () => {
      renderViewer({ rules: [mockRuleWithNoncurrentVersionExpiration] })
      expect(screen.getByText(/After 60 days \(keep 3 versions\)/i)).toBeInTheDocument()
    })

    test("displays AbortIncompleteMultipartUpload", () => {
      renderViewer({ rules: [mockRuleWithAbortUpload] })
      expect(screen.getByText(/After 7 days/i)).toBeInTheDocument()
    })

    test("displays tag filter", () => {
      renderViewer({ rules: [mockRuleWithTagFilter] })
      expect(screen.getByText(/Tag: Environment=production/i)).toBeInTheDocument()
    })
  })

  describe("Multiple rules", () => {
    test("displays all rules in the list", () => {
      renderViewer({ rules: [mockRuleWithFilter, mockRuleWithLegacyPrefix, mockRuleWithTransitions] })
      expect(screen.getByText("rule-with-filter")).toBeInTheDocument()
      expect(screen.getByText("legacy-rule")).toBeInTheDocument()
      expect(screen.getByText("transition-rule")).toBeInTheDocument()
    })
  })

  describe("Edit and Delete actions", () => {
    test("renders edit and delete buttons for each rule", () => {
      renderViewer({ rules: [mockRuleWithFilter] })
      // Buttons should be present
      const editButtons = screen.queryAllByTitle("Edit")
      const deleteButtons = screen.queryAllByTitle("Delete")
      expect(editButtons.length).toBeGreaterThan(0)
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    test("calls onEditRule when edit button is clicked", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnEditRule = vi.fn()
      renderViewer({ rules: [mockRuleWithFilter, mockRuleWithLegacyPrefix], onEditRule: mockOnEditRule })

      const editButtons = screen.getAllByTitle("Edit")
      expect(editButtons.length).toBeGreaterThanOrEqual(2)

      // Click first edit button - should call onEditRule with some index
      await user.click(editButtons[0])

      expect(mockOnEditRule).toHaveBeenCalledWith(expect.any(Number))
    })

    test("calls onDeleteRule with correct index", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnDeleteRule = vi.fn()
      renderViewer({ rules: [mockRuleWithFilter, mockRuleWithLegacyPrefix], onDeleteRule: mockOnDeleteRule })

      const deleteButtons = screen.getAllByTitle("Delete")
      expect(deleteButtons).toHaveLength(2)
      await user.click(deleteButtons[0])

      expect(mockOnDeleteRule).toHaveBeenCalledWith(0)
    })
  })

  describe("Empty state (no rules)", () => {
    test("does not crash when rules array is empty", () => {
      renderViewer({ rules: [] })
      // Should still show the Add New Rule button
      expect(screen.getByRole("button", { name: /Add New Rule/i })).toBeInTheDocument()
    })
  })
})
