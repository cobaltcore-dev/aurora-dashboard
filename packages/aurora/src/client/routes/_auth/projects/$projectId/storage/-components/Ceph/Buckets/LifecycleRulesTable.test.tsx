import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { LifecycleRulesTable } from "./LifecycleRulesTable"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"
import { trpcReact } from "@/client/trpcClient"

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        lifecycle: {
          get: {
            useQuery: vi.fn(),
          },
          set: {
            useMutation: vi.fn(),
          },
          delete: {
            useMutation: vi.fn(),
          },
        },
      },
    },
    useUtils: vi.fn(),
  },
}))

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
}))

const Wrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>
const PortalWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

describe("LifecycleRulesTable", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    // Mock tRPC hooks (reached by the nested DeleteLifecycleRuleModal)
    ;(trpcReact.useUtils as any).mockReturnValue({
      storage: {
        ceph: {
          lifecycle: {
            get: {
              invalidate: vi.fn(),
            },
          },
        },
      },
    })
    ;(trpcReact.storage.ceph.lifecycle.get.useQuery as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })
    ;(trpcReact.storage.ceph.lifecycle.set.useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    ;(trpcReact.storage.ceph.lifecycle.delete.useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
  })

  const mockOnEditRule = vi.fn()
  const mockOnToggleSelectRule = vi.fn()

  const sampleRule: LifecycleRuleRead = {
    ID: "rule-1",
    Status: "Enabled",
    Filter: { Prefix: "logs/" },
    Expiration: { Days: 30 },
    AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
  }

  const ruleWithoutId: LifecycleRuleRead = {
    Status: "Enabled",
    Filter: { Prefix: "" },
  }

  const sampleRulesWithIndices = [{ rule: sampleRule, originalIndex: 0 }]

  describe("Columns", () => {
    it("shows the Select column when canDeleteLifecycle is true", () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={sampleRulesWithIndices}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={true}
        />,
        { wrapper: Wrapper }
      )

      expect(screen.getByText("Select")).toBeInTheDocument()
    })

    it("hides the Select column when canDeleteLifecycle is false", () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={sampleRulesWithIndices}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={false}
        />,
        { wrapper: Wrapper }
      )

      expect(screen.queryByText("Select")).not.toBeInTheDocument()
    })

    it("renders the visible head cells", () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={sampleRulesWithIndices}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={true}
        />,
        { wrapper: Wrapper }
      )

      expect(screen.getByText("Rule ID")).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
      expect(screen.getByText("Scope")).toBeInTheDocument()
      expect(screen.getByText("Expiration")).toBeInTheDocument()
      expect(screen.getByText("Noncurrent Versions")).toBeInTheDocument()
      expect(screen.getByText("Other Actions")).toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("shows the no-rules message when isFiltered is false", () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={[]}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={true}
          isFiltered={false}
        />,
        { wrapper: Wrapper }
      )

      expect(screen.getByText("There are no lifecycle rules for this bucket")).toBeInTheDocument()
    })

    it("shows the no-matches message when isFiltered is true", () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={[]}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={true}
          isFiltered={true}
        />,
        { wrapper: Wrapper }
      )

      expect(screen.getByText("No lifecycle rules matching the current search criteria.")).toBeInTheDocument()
    })
  })

  describe("Cell formatting", () => {
    it("formats scope, expiration and abort-upload cells", () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={sampleRulesWithIndices}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={true}
        />,
        { wrapper: Wrapper }
      )

      expect(screen.getByText("Prefix: logs/")).toBeInTheDocument()
      expect(screen.getByText("After 30 days")).toBeInTheDocument()
      expect(screen.getByText("After 7 days")).toBeInTheDocument()
    })

    it("renders the — placeholder when a rule has no ID", () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={[{ rule: ruleWithoutId, originalIndex: 0 }]}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={true}
        />,
        { wrapper: Wrapper }
      )

      expect(screen.getByTestId("lifecycle-rule-row-0")).toHaveTextContent("—")
    })
  })

  describe("Permission gating - row actions", () => {
    const openRowMenu = async (rowTestId: string) => {
      const user = userEvent.setup()
      const row = screen.getByTestId(rowTestId)
      const menuButton = row.querySelector("button[aria-haspopup='menu']") as HTMLElement
      await user.click(menuButton)
    }

    it("shows Edit but hides Delete Lifecycle Rule when canUpdateLifecycle is true and canDeleteLifecycle is false", async () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={sampleRulesWithIndices}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={false}
        />,
        { wrapper: PortalWrapper }
      )

      await openRowMenu("lifecycle-rule-row-0")

      expect(screen.getByRole("menuitem", { name: "Edit Lifecycle Rule" })).toBeInTheDocument()
      expect(screen.queryByRole("menuitem", { name: "Delete Lifecycle Rule" })).not.toBeInTheDocument()
    })

    it("shows Delete Lifecycle Rule but hides Edit when canUpdateLifecycle is false and canDeleteLifecycle is true", async () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={sampleRulesWithIndices}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={false}
          canDeleteLifecycle={true}
        />,
        { wrapper: PortalWrapper }
      )

      await openRowMenu("lifecycle-rule-row-0")

      expect(screen.queryByRole("menuitem", { name: "Edit Lifecycle Rule" })).not.toBeInTheDocument()
      expect(screen.getByRole("menuitem", { name: "Delete Lifecycle Rule" })).toBeInTheDocument()
    })

    it("renders no row menu button when both canUpdateLifecycle and canDeleteLifecycle are false", () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={sampleRulesWithIndices}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={false}
          canDeleteLifecycle={false}
        />,
        { wrapper: PortalWrapper }
      )

      const row = screen.getByTestId("lifecycle-rule-row-0")
      expect(row.querySelector("button[aria-haspopup='menu']")).not.toBeInTheDocument()
    })
  })

  describe("isMutating", () => {
    it("disables both Edit and Delete Lifecycle Rule menu items when isMutating is true", async () => {
      const user = userEvent.setup()
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={sampleRulesWithIndices}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={true}
          isMutating={true}
        />,
        { wrapper: PortalWrapper }
      )

      const row = screen.getByTestId("lifecycle-rule-row-0")
      const menuButton = row.querySelector("button[aria-haspopup='menu']") as HTMLElement
      await user.click(menuButton)

      expect(screen.getByRole("menuitem", { name: "Edit Lifecycle Rule" })).toHaveAttribute("aria-disabled", "true")
      expect(screen.getByRole("menuitem", { name: "Delete Lifecycle Rule" })).toHaveAttribute("aria-disabled", "true")
    })
  })

  describe("Selection", () => {
    // Non-sequential originalIndex proves the checkbox/onToggle contract uses originalIndex,
    // not the row's position in the rendered array.
    const rulesWithNonSequentialIndices = [{ rule: sampleRule, originalIndex: 3 }]

    it("reflects selectedIndices in the row checkbox checked state", () => {
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={rulesWithNonSequentialIndices}
          selectedIndices={[3]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={true}
        />,
        { wrapper: Wrapper }
      )

      expect(screen.getByTestId("select-rule-3")).toBeChecked()
    })

    it("calls onToggleSelectRule with the originalIndex when the row checkbox is clicked", async () => {
      const user = userEvent.setup()
      const onToggleSelectRule = vi.fn()
      render(
        <LifecycleRulesTable
          bucketName="test-bucket"
          rulesWithIndices={rulesWithNonSequentialIndices}
          selectedIndices={[]}
          onToggleSelectRule={onToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateLifecycle={true}
          canDeleteLifecycle={true}
        />,
        { wrapper: Wrapper }
      )

      await user.click(screen.getByTestId("select-rule-3"))

      expect(onToggleSelectRule).toHaveBeenCalledWith(3)
    })
  })
})
