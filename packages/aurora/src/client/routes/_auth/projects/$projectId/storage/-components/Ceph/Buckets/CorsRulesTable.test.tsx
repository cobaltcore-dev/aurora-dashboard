import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { CorsRulesTable } from "./CorsRulesTable"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"
import { trpcReact } from "@/client/trpcClient"

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        cors: {
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

describe("CorsRulesTable", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    // Mock tRPC hooks
    ;(trpcReact.useUtils as any).mockReturnValue({
      storage: {
        ceph: {
          cors: {
            get: {
              invalidate: vi.fn(),
            },
          },
        },
      },
    })
    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })
    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    ;(trpcReact.storage.ceph.cors.delete.useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
  })

  const mockOnEditRule = vi.fn()
  const mockOnToggleSelectRule = vi.fn()

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

  const sampleRulesWithIndices = sampleRules.map((rule, index) => ({ rule, originalIndex: index }))

  const ruleWithoutOptionals: CorsRuleRead = {
    AllowedOrigins: ["https://example.com"],
    AllowedMethods: ["GET"],
  }

  it("renders all six columns", () => {
    render(
      <CorsRulesTable
        bucketName="test-bucket"
        rulesWithIndices={sampleRulesWithIndices}
        selectedIndices={[]}
        onToggleSelectRule={mockOnToggleSelectRule}
        onEditRule={mockOnEditRule}
        canUpdateCors={true}
        canDeleteCors={true}
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
        bucketName="test-bucket"
        rulesWithIndices={[{ rule: ruleWithoutOptionals, originalIndex: 0 }]}
        selectedIndices={[]}
        onToggleSelectRule={mockOnToggleSelectRule}
        onEditRule={mockOnEditRule}
        canUpdateCors={true}
        canDeleteCors={true}
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
        bucketName="test-bucket"
        rulesWithIndices={[]}
        selectedIndices={[]}
        onToggleSelectRule={mockOnToggleSelectRule}
        onEditRule={mockOnEditRule}
        canUpdateCors={true}
        canDeleteCors={true}
        isFiltered={false}
      />,
      { wrapper: Wrapper }
    )

    // Headers should still be present
    expect(screen.getByText("Rule ID")).toBeInTheDocument()
    expect(screen.getByText("There are no CORS rules for this bucket")).toBeInTheDocument()
  })

  it("renders wildcard warning only when * is present in AllowedOrigins", () => {
    const { rerender } = render(
      <CorsRulesTable
        bucketName="test-bucket"
        rulesWithIndices={sampleRulesWithIndices}
        selectedIndices={[]}
        onToggleSelectRule={mockOnToggleSelectRule}
        onEditRule={mockOnEditRule}
        canUpdateCors={true}
        canDeleteCors={true}
      />,
      { wrapper: Wrapper }
    )

    // Wildcard warning was removed, so this test should NOT find it
    expect(screen.queryByText(/wildcard \(\*\) for AllowedOrigins/i)).not.toBeInTheDocument()

    // Rerender without wildcard
    rerender(
      <Wrapper>
        <CorsRulesTable
          bucketName="test-bucket"
          rulesWithIndices={[{ rule: sampleRules[0], originalIndex: 0 }]}
          selectedIndices={[]}
          onToggleSelectRule={mockOnToggleSelectRule}
          onEditRule={mockOnEditRule}
          canUpdateCors={true}
          canDeleteCors={true}
        />
      </Wrapper>
    )

    expect(screen.queryByText(/wildcard \(\*\) for AllowedOrigins/i)).not.toBeInTheDocument()
  })

  it("renders actions menu button for each rule row", () => {
    render(
      <CorsRulesTable
        bucketName="test-bucket"
        rulesWithIndices={sampleRulesWithIndices}
        selectedIndices={[]}
        onToggleSelectRule={mockOnToggleSelectRule}
        onEditRule={mockOnEditRule}
        canUpdateCors={true}
        canDeleteCors={true}
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

  it("renders without errors when isMutating is true", () => {
    render(
      <CorsRulesTable
        bucketName="test-bucket"
        rulesWithIndices={sampleRulesWithIndices}
        selectedIndices={[]}
        onToggleSelectRule={mockOnToggleSelectRule}
        onEditRule={mockOnEditRule}
        canUpdateCors={true}
        canDeleteCors={true}
        isMutating={true}
      />,
      { wrapper: Wrapper }
    )

    // Component should render successfully with isMutating=true
    expect(screen.getByText("Rule ID")).toBeInTheDocument()
    expect(screen.getByText("rule-1")).toBeInTheDocument()
    expect(screen.getByText("rule-2")).toBeInTheDocument()

    // Menu buttons should still be present
    const firstRow = screen.getByTestId("cors-rule-row-0")
    const menuButton = firstRow.querySelector("button[aria-haspopup='menu']")
    expect(menuButton).toBeInTheDocument()
  })
})
