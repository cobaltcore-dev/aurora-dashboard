import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CorsRulesTable } from "./CorsRulesTable"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"

const Wrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("CorsRulesTable", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockOnAddRule = vi.fn()
  const mockOnEditRule = vi.fn()
  const mockOnDeleteRule = vi.fn()

  const sampleRules: CorsRuleRead[] = [
    {
      ID: "rule-1",
      AllowedOrigins: ["https://example.com", "https://test.com"],
      AllowedMethods: ["GET", "POST"],
      AllowedHeaders: ["Content-Type", "Authorization"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
    {
      ID: "rule-2",
      AllowedOrigins: ["*"],
      AllowedMethods: ["GET"],
      AllowedHeaders: undefined,
      ExposeHeaders: undefined,
      MaxAgeSeconds: undefined,
    },
  ]

  const ruleWithoutOptionals: CorsRuleRead = {
    AllowedOrigins: ["https://example.com"],
    AllowedMethods: ["GET"],
  }

  it("renders all six columns", () => {
    render(
      <CorsRulesTable
        rules={sampleRules}
        onAddRule={mockOnAddRule}
        onEditRule={mockOnEditRule}
        onDeleteRule={mockOnDeleteRule}
      />,
      { wrapper: Wrapper }
    )

    expect(screen.getByText("Rule ID")).toBeInTheDocument()
    expect(screen.getByText("Allowed Origins")).toBeInTheDocument()
    expect(screen.getByText("Allowed Methods")).toBeInTheDocument()
    expect(screen.getByText("Allowed Headers")).toBeInTheDocument()
    expect(screen.getByText("Expose Headers")).toBeInTheDocument()
    expect(screen.getByText("Max Age")).toBeInTheDocument()
  })

  it("renders — for missing ID, AllowedHeaders, ExposeHeaders, MaxAgeSeconds", () => {
    render(
      <CorsRulesTable
        rules={[ruleWithoutOptionals]}
        onAddRule={mockOnAddRule}
        onEditRule={mockOnEditRule}
        onDeleteRule={mockOnDeleteRule}
      />,
      { wrapper: Wrapper }
    )

    // Count the em-dashes rendered in the table cells (should be 4: ID, AllowedHeaders, ExposeHeaders, MaxAge)
    const cells = screen.getAllByText("—")
    expect(cells.length).toBeGreaterThanOrEqual(4)
  })

  it("renders empty state when rules array is empty", () => {
    render(
      <CorsRulesTable
        rules={[]}
        onAddRule={mockOnAddRule}
        onEditRule={mockOnEditRule}
        onDeleteRule={mockOnDeleteRule}
      />,
      { wrapper: Wrapper }
    )

    expect(screen.getByText("There are no CORS rules for this bucket")).toBeInTheDocument()
    // Add button should still be visible
    expect(screen.getByText("Add rule")).toBeInTheDocument()
  })

  it("renders wildcard warning only when * is present in AllowedOrigins", () => {
    const { rerender } = render(
      <CorsRulesTable
        rules={sampleRules}
        onAddRule={mockOnAddRule}
        onEditRule={mockOnEditRule}
        onDeleteRule={mockOnDeleteRule}
      />,
      { wrapper: Wrapper }
    )

    // sampleRules[1] has AllowedOrigins: ["*"]
    expect(screen.getByText(/wildcard \(\*\) for AllowedOrigins/i)).toBeInTheDocument()

    // Rerender without wildcard
    rerender(
      <Wrapper>
        <CorsRulesTable
          rules={[sampleRules[0]]}
          onAddRule={mockOnAddRule}
          onEditRule={mockOnEditRule}
          onDeleteRule={mockOnDeleteRule}
        />
      </Wrapper>
    )

    expect(screen.queryByText(/wildcard \(\*\) for AllowedOrigins/i)).not.toBeInTheDocument()
  })

  it("renders actions menu button for each rule row", () => {
    render(
      <CorsRulesTable
        rules={sampleRules}
        onAddRule={mockOnAddRule}
        onEditRule={mockOnEditRule}
        onDeleteRule={mockOnDeleteRule}
      />,
      { wrapper: Wrapper }
    )

    const firstRow = screen.getByTestId("cors-rule-row-0")
    const secondRow = screen.getByTestId("cors-rule-row-1")

    const firstMenuButton = firstRow.querySelector("button[aria-haspopup='menu']")
    const secondMenuButton = secondRow.querySelector("button[aria-haspopup='menu']")

    expect(firstMenuButton).toBeInTheDocument()
    expect(secondMenuButton).toBeInTheDocument()
  })

  it("fires onAddRule when Add rule button is clicked", async () => {
    const user = userEvent.setup()

    render(
      <CorsRulesTable
        rules={sampleRules}
        onAddRule={mockOnAddRule}
        onEditRule={mockOnEditRule}
        onDeleteRule={mockOnDeleteRule}
      />,
      { wrapper: Wrapper }
    )

    const addButton = screen.getByText("Add rule")
    await user.click(addButton)

    expect(mockOnAddRule).toHaveBeenCalled()
  })

  it("disables buttons when isMutating is true", () => {
    render(
      <CorsRulesTable
        rules={sampleRules}
        onAddRule={mockOnAddRule}
        onEditRule={mockOnEditRule}
        onDeleteRule={mockOnDeleteRule}
        isMutating={true}
      />,
      { wrapper: Wrapper }
    )

    const addButton = screen.getByText("Add rule")
    expect(addButton).toBeDisabled()
  })
})
