import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
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
  onValidationChange = vi.fn(),
}: {
  editingRule?: LifecycleRuleRead | null
  onSubmit?: (rule: LifecycleRuleRead) => void
  onValidationChange?: (isValid: boolean) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <LifecycleRuleForm
          formId="lifecycle-rule-form"
          editingRule={editingRule}
          onSubmit={onSubmit}
          onValidationChange={onValidationChange}
        />
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
    test("renders all form fields", () => {
      renderForm()
      expect(screen.getByLabelText(/Rule ID/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Enable rule/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Scope/i)).toBeInTheDocument()
    })

    test("defaults Status to Disabled for new rules", async () => {
      renderForm()
      // Check that "Enable rule" checkbox is unchecked (Status="Disabled")
      const enableCheckbox = screen.getByLabelText(/Enable rule/i)
      expect(enableCheckbox).not.toBeChecked()
    })
  })

  describe("Item 23: Legacy Prefix handling", () => {
    test("loads legacy Prefix into form when Filter is absent", () => {
      renderForm({ editingRule: mockRuleWithLegacyPrefix })
      const prefixInput = screen.getByLabelText(/Scope/i) as HTMLInputElement
      expect(prefixInput.value).toBe("legacy/")
    })

    test("migrates legacy Prefix to Filter on submit", async () => {
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithLegacyPrefix, onSubmit: mockOnSubmit })

      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Filter).toBeDefined()
      expect(submittedRule.Filter.Prefix).toBe("legacy/")
      expect(submittedRule.Prefix).toBeUndefined()
    })

    test("clears legacy Prefix when Filter is set", async () => {
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithLegacyPrefix, onSubmit: mockOnSubmit })

      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Prefix).toBeUndefined()
    })
  })

  describe("Item 24: Date/ExpiredObjectDeleteMarker expiration handling", () => {
    test("allows saving rule with Date expiration without Days field", async () => {
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithDateExpiration, onSubmit: mockOnSubmit })

      // Expiration checkbox should be checked
      const expirationCheckbox = screen.getByLabelText(/Expire objects/i)
      expect(expirationCheckbox).toBeChecked()

      // Days field should be empty but form should be submittable
      const daysInput = screen.getByLabelText(/Days until deletion/i) as HTMLInputElement
      expect(daysInput.value).toBe("")

      // Save button should NOT be disabled (item 24 fix)
      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!

      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      // Should preserve original Date expiration
      expect(submittedRule.Expiration).toEqual({ Date: "2026-12-31T00:00:00.000Z" })
    })

    test("allows saving rule with ExpiredObjectDeleteMarker", async () => {
      const mockOnSubmit = vi.fn()
      renderForm({ editingRule: mockRuleWithExpiredObjectDeleteMarker, onSubmit: mockOnSubmit })

      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!

      fireEvent.submit(form)

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
      const daysInput = screen.getByLabelText(/Days until deletion/i)
      await user.clear(daysInput)
      await user.type(daysInput, "60")

      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!
      fireEvent.submit(form)

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

      // Change Status by unchecking "Enable rule" checkbox
      const enableCheckbox = screen.getByLabelText(/Enable rule/i)
      expect(enableCheckbox).toBeChecked() // Should be checked initially since rule is Enabled
      await user.click(enableCheckbox) // Uncheck to disable

      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!
      fireEvent.submit(form)

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

    test("preserves NewerNoncurrentVersions when editing NoncurrentVersionExpiration", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      const ruleWithNewerNoncurrent: LifecycleRuleRead = {
        ID: "rule-with-newer-noncurrent",
        Status: "Enabled",
        Filter: {},
        Expiration: { Days: 365 },
        NoncurrentVersionExpiration: {
          NoncurrentDays: 90,
          NewerNoncurrentVersions: 3,
        },
      }
      renderForm({ editingRule: ruleWithNewerNoncurrent, onSubmit: mockOnSubmit })

      // NoncurrentVersionExpiration should be pre-checked with days=90
      const noncurrentCheckbox = screen.getByLabelText(/Expire non-current versions/i)
      expect(noncurrentCheckbox).toBeChecked()
      const noncurrentDaysInput = screen.getByLabelText(/Days after becoming non-current/i)
      expect(noncurrentDaysInput).toHaveValue(90)

      // Change noncurrent days to 120
      await user.clear(noncurrentDaysInput)
      await user.type(noncurrentDaysInput, "120")

      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.NoncurrentVersionExpiration).toEqual({
        NoncurrentDays: 120,
        NewerNoncurrentVersions: 3, // Should preserve this field
      })
    })
  })

  describe("Status field (item 3: Checkbox onChange)", () => {
    test("allows changing Status from Enabled to Disabled", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      const enabledRule = { ...mockRuleWithTransitions, Status: "Enabled" as const }
      renderForm({ editingRule: enabledRule, onSubmit: mockOnSubmit })

      // "Enable rule" checkbox should be checked initially since rule is Enabled
      const enableCheckbox = screen.getByLabelText(/Enable rule/i)
      expect(enableCheckbox).toBeChecked()

      // Uncheck to disable
      await user.click(enableCheckbox)
      expect(enableCheckbox).not.toBeChecked()

      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!
      fireEvent.submit(form)

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

      const expirationCheckbox = screen.getByLabelText(/Expire objects/i)
      expect(expirationCheckbox).not.toBeChecked()

      await user.click(expirationCheckbox)

      expect(expirationCheckbox).toBeChecked()
      expect(screen.getByLabelText(/Days until deletion/i)).toBeInTheDocument()
    })

    test("allows toggling Noncurrent Version Expiration action", async () => {
      const user = userEvent.setup({ delay: null })
      renderForm()

      const noncurrentCheckbox = screen.getByLabelText(/Expire non-current versions/i)
      await user.click(noncurrentCheckbox)

      expect(noncurrentCheckbox).toBeChecked()
      expect(screen.getByLabelText(/Days after becoming non-current/i)).toBeInTheDocument()
    })

    test("allows toggling Abort incomplete multipart uploads action", async () => {
      const user = userEvent.setup({ delay: null })
      renderForm()

      const abortCheckbox = screen.getByLabelText(/Abort incomplete multipart uploads/i)
      await user.click(abortCheckbox)

      expect(abortCheckbox).toBeChecked()
      expect(screen.getByLabelText(/Days until cleanup/i)).toBeInTheDocument()
    })
  })

  describe("Tag filter editor (item 6)", () => {
    test("allows adding tag filters", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ onSubmit: mockOnSubmit })

      // Enable expiration action first
      const expirationCheckbox = screen.getByLabelText(/Expire objects/i)
      await user.click(expirationCheckbox)

      const daysInput = screen.getByLabelText(/Days until deletion/i)
      await user.type(daysInput, "30")

      // Add a tag
      const keyInput = screen.getByLabelText(/Key/i)
      const valueInput = screen.getByLabelText(/Value/i)
      await user.type(keyInput, "Environment")
      await user.type(valueInput, "production")

      const addButton = screen.getByRole("button", { name: /Add/i })
      await user.click(addButton)

      // Tag should appear in the list - Pill component displays key and value separately
      expect(screen.getByText("Environment")).toBeInTheDocument()
      expect(screen.getByText("production")).toBeInTheDocument()

      // Submit and verify
      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      const submittedRule = mockOnSubmit.mock.calls[0][0]
      expect(submittedRule.Filter.Tag).toEqual({ Key: "Environment", Value: "production" })
    })

    test("allows adding a tag filter by pressing Enter", async () => {
      const user = userEvent.setup({ delay: null })
      renderForm({ onSubmit: vi.fn() })

      const keyInput = screen.getByLabelText(/Key/i)
      const valueInput = screen.getByLabelText(/Value/i)
      await user.type(keyInput, "Environment")
      await user.type(valueInput, "production{Enter}")

      expect(screen.getByText("Environment")).toBeInTheDocument()
      expect(screen.getByText("production")).toBeInTheDocument()
      expect(keyInput).toHaveValue("")
      expect(valueInput).toHaveValue("")
    })

    test("uses And filter when prefix and tags are both present", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnSubmit = vi.fn()
      renderForm({ onSubmit: mockOnSubmit })

      // Enable expiration action
      const expirationCheckbox = screen.getByLabelText(/Expire objects/i)
      await user.click(expirationCheckbox)
      const daysInput = screen.getByLabelText(/Days until deletion/i)
      await user.type(daysInput, "30")

      // Add prefix
      const prefixInput = screen.getByLabelText(/Scope/i)
      await user.type(prefixInput, "logs/")

      // Add a tag
      const keyInput = screen.getByLabelText(/Key/i)
      const valueInput = screen.getByLabelText(/Value/i)
      await user.type(keyInput, "Team")
      await user.type(valueInput, "backend")
      const addButton = screen.getByRole("button", { name: /Add/i })
      await user.click(addButton)

      const form = screen.getByRole("form") || document.querySelector("#lifecycle-rule-form")!
      fireEvent.submit(form)

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
    test("requires at least one action to be enabled", async () => {
      const mockOnValidationChange = vi.fn()
      renderForm({ onValidationChange: mockOnValidationChange })

      // Initially, no actions enabled - form should be invalid
      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith(false)
      })
    })

    test("requires Days value when Expiration is checked", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnValidationChange = vi.fn()
      renderForm({ onValidationChange: mockOnValidationChange })

      const expirationCheckbox = screen.getByLabelText(/Expire objects/i)
      await user.click(expirationCheckbox)

      // After checking expiration without entering days, form should be invalid
      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenLastCalledWith(false)
      })
    })

    test("enables Save when action has valid data", async () => {
      const user = userEvent.setup({ delay: null })
      const mockOnValidationChange = vi.fn()
      renderForm({ onValidationChange: mockOnValidationChange })

      const expirationCheckbox = screen.getByLabelText(/Expire objects/i)
      await user.click(expirationCheckbox)

      const daysInput = screen.getByLabelText(/Days until deletion/i)
      await user.type(daysInput, "30")

      // After entering valid days, form should be valid
      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith(true)
      })
    })

    test("treats transitions-only rule as valid", async () => {
      const mockOnValidationChange = vi.fn()
      const editingRule: LifecycleRuleRead = {
        ID: "transition-rule",
        Status: "Enabled",
        Filter: {},
        Transitions: [{ Days: 30, StorageClass: "GLACIER" }],
      }
      renderForm({ onValidationChange: mockOnValidationChange, editingRule })

      // Form with existing transitions should be valid even without Expiration
      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith(true)
      })
    })
  })
})
