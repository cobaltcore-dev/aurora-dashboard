import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { LifecycleRuleForm } from "./LifecycleRuleForm"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockRuleWithTransitions: LifecycleRuleRead = {
  ID: "rule-with-transitions",
  Status: "Enabled",
  Filter: { Prefix: "logs/" },
  Expiration: { Days: 90 },
  Transitions: [{ Days: 30, StorageClass: "GLACIER" }],
}

const mockRuleWithLegacyPrefix: LifecycleRuleRead = {
  ID: "legacy-rule",
  Status: "Enabled",
  Prefix: "legacy/",
  Expiration: { Days: 30 },
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

// ─── Render helper ────────────────────────────────────────────────────────────

const renderForm = ({
  editingRule = null,
  onSubmit = vi.fn(),
  onCancel = vi.fn(),
}: {
  editingRule?: LifecycleRuleRead | null
  onSubmit?: (rule: LifecycleRuleRead) => void
  onCancel?: () => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <LifecycleRuleForm editingRule={editingRule} onSubmit={onSubmit} onCancel={onCancel} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LifecycleRuleForm", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Initial rendering", () => {
    test("renders Add form when editingRule is null", () => {
      renderForm()
      expect(screen.getByText(/Add New Lifecycle Rule/i)).toBeInTheDocument()
    })

    test("renders Edit form when editingRule is provided", () => {
      renderForm({ editingRule: mockRuleWithTransitions })
      expect(screen.getByText(/Edit Lifecycle Rule/i)).toBeInTheDocument()
    })

    test("renders all form fields", () => {
      renderForm()
      expect(screen.getByLabelText(/Rule ID/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Prefix Filter/i)).toBeInTheDocument()
    })

    test("defaults Status to Disabled for new rules", async () => {
      renderForm()
      // Check that "Disabled" text is visible in the select (allow multiple instances from dropdown)
      await waitFor(() => {
        const disabledTexts = screen.getAllByText("Disabled")
        expect(disabledTexts.length).toBeGreaterThan(0)
      })
    })
  })

  describe("Item 23: Legacy Prefix handling", () => {
    test("loads legacy Prefix into form when Filter is absent", () => {
      renderForm({ editingRule: mockRuleWithLegacyPrefix })
      const prefixInput = screen.getByLabelText(/Prefix Filter/i) as HTMLInputElement
      expect(prefixInput.value).toBe("legacy/")
    })

    test("migrates legacy Prefix to Filter on submit", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithLegacyPrefix, onSubmit: mockOnSubmit })

      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Filter).toBeDefined()
      expect(submittedRule.Filter.Prefix).toBe("legacy/")
      expect(submittedRule.Prefix).toBeUndefined()
    })

    test("clears legacy Prefix when Filter is set", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithLegacyPrefix, onSubmit: mockOnSubmit })

      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Prefix).toBeUndefined()
    })
  })

  describe("Item 24: Date/ExpiredObjectDeleteMarker expiration handling", () => {
    test("allows saving rule with Date expiration without Days field", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithDateExpiration, onSubmit: mockOnSubmit })

      // Expiration checkbox should be checked
      const expirationCheckbox = screen.getByLabelText(/Expire Objects/i)
      expect(expirationCheckbox).toBeChecked()

      // Days field should be empty but form should be submittable
      const daysInput = screen.getByLabelText(/Expiration Days/i) as HTMLInputElement
      expect(daysInput.value).toBe("")

      // Save button should NOT be disabled (item 24 fix)
      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      expect(saveButton).not.toBeDisabled()

      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      // Should preserve original Date expiration
      expect(submittedRule.Expiration).toEqual({ Date: "2026-12-31T00:00:00.000Z" })
    })

    test("allows saving rule with ExpiredObjectDeleteMarker", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithExpiredObjectDeleteMarker, onSubmit: mockOnSubmit })

      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      expect(saveButton).not.toBeDisabled()

      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Expiration).toEqual({ ExpiredObjectDeleteMarker: true })
    })

    test("replaces Date expiration with Days when user enters days", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithDateExpiration, onSubmit: mockOnSubmit })

      // Enter days value
      const daysInput = screen.getByLabelText(/Expiration Days/i)
      await user.clear(daysInput)
      await user.type(daysInput, "60")

      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      // Should now have Days expiration instead of Date
      expect(submittedRule.Expiration).toEqual({ Days: 60 })
    })
  })

  describe("Item 1: Transitions preservation", () => {
    test("preserves Transitions when editing unrelated field", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithTransitions, onSubmit: mockOnSubmit })

      // Change Status
      const statusSelect = screen.getByLabelText(/Status/i)
      await user.click(statusSelect)
      await user.click(screen.getByText("Disabled"))

      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Transitions).toEqual(mockRuleWithTransitions.Transitions)
      expect(submittedRule.Status).toBe("Disabled")
    })

    test("shows read-only message when rule has Transitions", () => {
      renderForm({ editingRule: mockRuleWithTransitions })
      expect(screen.getByText(/storage-class transitions/i)).toBeInTheDocument()
      expect(screen.getByText(/preserved unchanged/i)).toBeInTheDocument()
    })
  })

  describe("Status field (item 3: Select onChange fix)", () => {
    test("allows changing Status from Enabled to Disabled", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      const enabledRule = { ...mockRuleWithTransitions, Status: "Enabled" as const }
      renderForm({ editingRule: enabledRule, onSubmit: mockOnSubmit })

      // Should show "Enabled" initially (allow multiple instances from dropdown)
      await waitFor(() => {
        const enabledTexts = screen.getAllByText("Enabled")
        expect(enabledTexts.length).toBeGreaterThan(0)
      })

      const statusSelect = screen.getByLabelText(/Status/i)
      await user.click(statusSelect)
      await user.click(screen.getAllByText("Disabled")[0])

      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Status).toBe("Disabled")
    })
  })

  describe("Action toggles", () => {
    test("allows toggling Expiration action", async () => {
      const user = userEvent.setup({ delay: null })
      renderForm()

      const expirationCheckbox = screen.getByLabelText(/Expire Objects/i)
      expect(expirationCheckbox).not.toBeChecked()

      await user.click(expirationCheckbox)

      expect(expirationCheckbox).toBeChecked()
      expect(screen.getByLabelText(/Expiration Days/i)).toBeInTheDocument()
    })

    test("allows toggling Noncurrent Version Expiration action", async () => {
      const user = userEvent.setup({ delay: null })
      renderForm()

      const noncurrentCheckbox = screen.getByLabelText(/Expire Noncurrent Versions/i)
      await user.click(noncurrentCheckbox)

      expect(noncurrentCheckbox).toBeChecked()
      expect(screen.getByLabelText(/Noncurrent Days/i)).toBeInTheDocument()
    })

    test("allows toggling Abort Incomplete Multipart Uploads action", async () => {
      const user = userEvent.setup({ delay: null })
      renderForm()

      const abortCheckbox = screen.getByLabelText(/Abort Incomplete Multipart Uploads/i)
      await user.click(abortCheckbox)

      expect(abortCheckbox).toBeChecked()
      expect(screen.getByLabelText(/Abort After Days/i)).toBeInTheDocument()
    })
  })

  describe("Tag filter editor (item 6)", () => {
    test("allows adding tag filters", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ onSubmit: mockOnSubmit })

      // Enable expiration action first
      const expirationCheckbox = screen.getByLabelText(/Expire Objects/i)
      await user.click(expirationCheckbox)

      const daysInput = screen.getByLabelText(/Expiration Days/i)
      await user.type(daysInput, "30")

      // Add a tag
      const keyInput = screen.getByLabelText(/Key/i)
      const valueInput = screen.getByLabelText(/Value/i)
      await user.type(keyInput, "Environment")
      await user.type(valueInput, "production")

      const addButton = screen.getByRole("button", { name: /Add Tag/i })
      await user.click(addButton)

      // Tag should appear in the list
      expect(screen.getByText(/Environment=production/i)).toBeInTheDocument()

      // Submit and verify
      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Filter.Tag).toEqual({ Key: "Environment", Value: "production" })
    })

    test("uses And filter when prefix and tags are both present", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ onSubmit: mockOnSubmit })

      // Enable expiration action
      const expirationCheckbox = screen.getByLabelText(/Expire Objects/i)
      await user.click(expirationCheckbox)
      const daysInput = screen.getByLabelText(/Expiration Days/i)
      await user.type(daysInput, "30")

      // Add prefix
      const prefixInput = screen.getByLabelText(/Prefix Filter/i)
      await user.type(prefixInput, "logs/")

      // Add a tag
      const keyInput = screen.getByLabelText(/Key/i)
      const valueInput = screen.getByLabelText(/Value/i)
      await user.type(keyInput, "Team")
      await user.type(valueInput, "backend")
      const addButton = screen.getByRole("button", { name: /Add Tag/i })
      await user.click(addButton)

      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Filter.And).toBeDefined()
      expect(submittedRule.Filter.And.Prefix).toBe("logs/")
      expect(submittedRule.Filter.And.Tags).toEqual([{ Key: "Team", Value: "backend" }])
    })
  })

  describe("Form validation", () => {
    test("requires at least one action to be enabled", () => {
      renderForm()
      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      expect(saveButton).toBeDisabled()
    })

    test("requires Days value when Expiration is checked", async () => {
      const user = userEvent.setup({ delay: null })
      renderForm()

      const expirationCheckbox = screen.getByLabelText(/Expire Objects/i)
      await user.click(expirationCheckbox)

      // Save should be disabled when days is empty
      const saveButton = screen.getByRole("button", { name: /Save Rule/i })
      expect(saveButton).toBeDisabled()
    })

    test("enables Save when action has valid data", async () => {
      const user = userEvent.setup({ delay: null })
      renderForm()

      const expirationCheckbox = screen.getByLabelText(/Expire Objects/i)
      await user.click(expirationCheckbox)

      const daysInput = screen.getByLabelText(/Expiration Days/i)
      await user.type(daysInput, "30")

      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: /Save Rule/i })
        expect(saveButton).not.toBeDisabled()
      })
    })
  })

  describe("Cancel behavior", () => {
    test("calls onCancel when Cancel button is clicked", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnCancel = vi.fn()
      renderForm({ onCancel: mockOnCancel })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })
})
