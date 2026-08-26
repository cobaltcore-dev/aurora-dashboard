import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LifecycleRulesTab } from "./LifecycleRulesTab"
import { trpcReact } from "@/client/trpcClient"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { messages as enMessages } from "@/locales/en/messages"

/* eslint-disable @typescript-eslint/no-explicit-any */

// Initialize i18n
i18n.load("en", enMessages)
i18n.activate("en")

// Mock Route.useSearch
vi.mock("@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects", () => ({
  Route: {
    useSearch: vi.fn(() => ({
      lifecycleSortBy: "ID",
      lifecycleSortDirection: "asc",
      lifecycleSearch: "",
    })),
    fullPath: "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
  },
}))

// Mock useNavigate and useRouteContext
vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useRouteContext: vi.fn(() => ({ onTrackEvent: undefined })),
}))

// Mock dependencies
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

let mockCephPermissions = { canUpdateLifecycle: true, canDeleteLifecycle: true }

vi.mock("../hooks/useCephPermissions", () => ({
  useCephPermissions: () => ({ permissions: mockCephPermissions, isLoading: false, isError: false }),
}))

vi.mock("@cloudoperators/juno-ui-components", async () => {
  const actual = await vi.importActual("@cloudoperators/juno-ui-components")
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

vi.mock("./LifecycleRuleModal", () => ({
  LifecycleRuleModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null
    return <div>Configure New Rule</div>
  },
}))

vi.mock("./LifecycleRulesTable", () => ({
  LifecycleRulesTable: ({
    rulesWithIndices,
    onEditRule,
  }: {
    rulesWithIndices: any[]
    onEditRule: (index: number) => void
  }) => (
    <div>
      <div>
        {rulesWithIndices.length === 0
          ? "There are no lifecycle rules for this bucket"
          : `${rulesWithIndices.length} rule(s)`}
      </div>
      {rulesWithIndices.map(({ originalIndex }: any) => (
        <div key={originalIndex}>
          <button onClick={() => onEditRule(originalIndex)}>Edit</button>
        </div>
      ))}
    </div>
  ),
}))

const mockRule: LifecycleRuleRead = {
  ID: "test-rule",
  Status: "Enabled",
  Filter: { Prefix: "logs/" },
  Expiration: { Days: 30 },
}

describe("LifecycleRulesTab", () => {
  const mockInvalidate = vi.fn()
  const mockMutate = vi.fn()
  const mockDeleteMutate = vi.fn()

  const Wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

  beforeEach(() => {
    vi.clearAllMocks()
    mockCephPermissions = { canUpdateLifecycle: true, canDeleteLifecycle: true }
    ;(trpcReact.useUtils as any).mockReturnValue({
      storage: {
        ceph: {
          lifecycle: {
            get: {
              invalidate: mockInvalidate,
            },
          },
        },
      },
    })
    ;(trpcReact.storage.ceph.lifecycle.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    ;(trpcReact.storage.ceph.lifecycle.delete.useMutation as any).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
  })

  it("shows loading spinner while fetching lifecycle rules", () => {
    ;(trpcReact.storage.ceph.lifecycle.get.useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(<LifecycleRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("shows error message when query fails", () => {
    ;(trpcReact.storage.ceph.lifecycle.get.useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "Network error" },
    })

    render(<LifecycleRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    expect(screen.getByText(/Failed to load lifecycle configuration/i)).toBeInTheDocument()
    expect(screen.getByText("Network error")).toBeInTheDocument()
  })

  it("renders empty state when there are no rules", () => {
    ;(trpcReact.storage.ceph.lifecycle.get.useQuery as any).mockReturnValue({
      data: { rules: [] },
      isLoading: false,
      error: null,
    })

    render(<LifecycleRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    expect(screen.getByText(/There are no lifecycle rules for this bucket/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Create Lifecycle Rule/i })).toBeInTheDocument()
  })

  it("opens add rule modal when clicking Create Lifecycle Rule button", async () => {
    const user = userEvent.setup()
    ;(trpcReact.storage.ceph.lifecycle.get.useQuery as any).mockReturnValue({
      data: { rules: [] },
      isLoading: false,
      error: null,
    })

    render(<LifecycleRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    const createButton = screen.getByRole("button", { name: /Create Lifecycle Rule/i })
    await user.click(createButton)

    expect(screen.getByText("Configure New Rule")).toBeInTheDocument()
  })

  it("displays multiple rules when present", () => {
    ;(trpcReact.storage.ceph.lifecycle.get.useQuery as any).mockReturnValue({
      data: { rules: [mockRule, { ...mockRule, ID: "test-rule-2" }] },
      isLoading: false,
      error: null,
    })

    render(<LifecycleRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    expect(screen.getByText("2 rule(s)")).toBeInTheDocument()
  })

  describe("Permission gating", () => {
    beforeEach(() => {
      ;(trpcReact.storage.ceph.lifecycle.get.useQuery as any).mockReturnValue({
        data: { rules: [mockRule] },
        isLoading: false,
        error: null,
      })
    })

    it("hides the Create Lifecycle Rule button when canUpdateLifecycle is false", () => {
      mockCephPermissions = { canUpdateLifecycle: false, canDeleteLifecycle: true }
      render(<LifecycleRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })
      expect(screen.queryByRole("button", { name: /Create Lifecycle Rule/i })).not.toBeInTheDocument()
    })

    it("hides the bulk selection/actions toolbar when canDeleteLifecycle is false", () => {
      mockCephPermissions = { canUpdateLifecycle: true, canDeleteLifecycle: false }
      render(<LifecycleRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })
      expect(screen.queryByTestId("select-all-rules")).not.toBeInTheDocument()
    })

    it("shows the bulk selection/actions toolbar when canDeleteLifecycle is true", () => {
      mockCephPermissions = { canUpdateLifecycle: true, canDeleteLifecycle: true }
      render(<LifecycleRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })
      expect(screen.getByTestId("select-all-rules")).toBeInTheDocument()
    })
  })

  describe("mutationsBlocked (skipped rules)", () => {
    it("keeps the selection checkbox enabled but disables the Actions button when a rule was skipped on read", async () => {
      const user = userEvent.setup()
      mockCephPermissions = { canUpdateLifecycle: true, canDeleteLifecycle: true }
      ;(trpcReact.storage.ceph.lifecycle.get.useQuery as any).mockReturnValue({
        data: { rules: [mockRule], skippedRuleCount: 1 },
        isLoading: false,
        error: null,
      })

      render(<LifecycleRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

      const selectAllCheckbox = screen.getByTestId("select-all-rules")
      expect(selectAllCheckbox).not.toBeDisabled()

      await user.click(selectAllCheckbox)

      expect(screen.getByRole("button", { name: /Actions/i })).toBeDisabled()
    })
  })
})
