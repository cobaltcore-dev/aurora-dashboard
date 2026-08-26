import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CorsRulesTab } from "./CorsRulesTab"
import { trpcReact } from "@/client/trpcClient"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"
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
      corsSortBy: "ID",
      corsSortDirection: "asc",
      corsSearch: "",
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

let mockCephPermissions = { canUpdateCors: true, canDeleteCors: true }

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

vi.mock("./CorsRuleModal", () => ({
  CorsRuleModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null
    return <div>Configure New Rule</div>
  },
}))

vi.mock("./CorsRulesTable", () => ({
  CorsRulesTable: ({
    rulesWithIndices,
    onEditRule,
  }: {
    rulesWithIndices: any[]
    onEditRule: (index: number) => void
  }) => (
    <div>
      <div>
        {rulesWithIndices.length === 0
          ? "There are no CORS rules for this bucket"
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

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
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

const mockRule: CorsRuleRead = {
  ID: "test-rule",
  AllowedOrigins: ["https://example.com"],
  AllowedMethods: ["GET", "POST"],
  AllowedHeaders: ["Content-Type"],
  ExposeHeaders: ["ETag"],
  MaxAgeSeconds: 3600,
}

describe("CorsRulesTab", () => {
  const mockInvalidate = vi.fn()
  const mockMutate = vi.fn()
  const mockDeleteMutate = vi.fn()

  const Wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

  beforeEach(() => {
    vi.clearAllMocks()
    mockCephPermissions = { canUpdateCors: true, canDeleteCors: true }
    ;(trpcReact.useUtils as any).mockReturnValue({
      storage: {
        ceph: {
          cors: {
            get: {
              invalidate: mockInvalidate,
            },
          },
        },
      },
    })
  })

  it("shows loading spinner while fetching CORS rules", () => {
    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })
    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    ;(trpcReact.storage.ceph.cors.delete.useMutation as any).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })

    render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("shows error message when query fails", () => {
    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "Network error" },
    })
    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    ;(trpcReact.storage.ceph.cors.delete.useMutation as any).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })

    render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    expect(screen.getByText(/Failed to load CORS configuration/i)).toBeInTheDocument()
    expect(screen.getByText("Network error")).toBeInTheDocument()
  })

  it("renders empty state when corsRules is null", () => {
    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: { corsRules: null },
      isLoading: false,
      error: null,
    })
    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    ;(trpcReact.storage.ceph.cors.delete.useMutation as any).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })

    render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    expect(screen.getByText(/There are no CORS rules for this bucket/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Create CORS Rule/i })).toBeInTheDocument()
  })

  it("renders when corsRules is an empty array", () => {
    // This test verifies that empty array state renders properly
    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: { corsRules: [] },
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

    render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    // Verify the empty state is shown
    expect(screen.getByText("There are no CORS rules for this bucket")).toBeInTheDocument()
  })

  it("opens add rule modal when clicking Create CORS Rule button", async () => {
    const user = userEvent.setup()

    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: { corsRules: [] },
      isLoading: false,
      error: null,
    })
    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    ;(trpcReact.storage.ceph.cors.delete.useMutation as any).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })

    render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    // Click the Create CORS Rule button
    const createButton = screen.getByRole("button", { name: /Create CORS Rule/i })
    await user.click(createButton)

    // The CorsRuleModal should open (we mocked it to show "Configure New Rule")
    expect(screen.getByText("Configure New Rule")).toBeInTheDocument()
  })

  it("displays multiple rules when present", () => {
    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: {
        corsRules: [mockRule, { ...mockRule, ID: "test-rule-2" }],
      },
      isLoading: false,
      error: null,
    })
    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    ;(trpcReact.storage.ceph.cors.delete.useMutation as any).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })

    render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    // Should show 2 rules
    expect(screen.getByText("2 rule(s)")).toBeInTheDocument()
  })

  it("does not show draft state banners (immediate save architecture)", () => {
    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: { corsRules: [mockRule] },
      isLoading: false,
      error: null,
    })
    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })
    ;(trpcReact.storage.ceph.cors.delete.useMutation as any).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })

    render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })

    // Should NOT show unsaved changes banner
    expect(screen.queryByText(/Unsaved Changes/i)).not.toBeInTheDocument()
    // Should NOT show save/discard buttons
    expect(screen.queryByRole("button", { name: /Save/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Discard/i })).not.toBeInTheDocument()
    // Should NOT show validation error banner
    expect(screen.queryByText(/Validation Error/i)).not.toBeInTheDocument()
  })

  describe("Permission gating", () => {
    beforeEach(() => {
      ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
        data: { corsRules: [mockRule] },
        isLoading: false,
        error: null,
      })
      ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        reset: vi.fn(),
      })
      ;(trpcReact.storage.ceph.cors.delete.useMutation as any).mockReturnValue({
        mutate: mockDeleteMutate,
        isPending: false,
        isError: false,
        error: null,
        reset: vi.fn(),
      })
    })

    it("hides the Create CORS Rule button when canUpdateCors is false", () => {
      mockCephPermissions = { canUpdateCors: false, canDeleteCors: true }
      render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })
      expect(screen.queryByRole("button", { name: /Create CORS Rule/i })).not.toBeInTheDocument()
    })

    it("hides the bulk selection/actions toolbar when canDeleteCors is false", () => {
      mockCephPermissions = { canUpdateCors: true, canDeleteCors: false }
      render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })
      expect(screen.queryByTestId("select-all-rules")).not.toBeInTheDocument()
    })

    it("shows the bulk selection/actions toolbar when canDeleteCors is true", () => {
      mockCephPermissions = { canUpdateCors: true, canDeleteCors: true }
      render(<CorsRulesTab bucketName="test-bucket" />, { wrapper: Wrapper })
      expect(screen.getByTestId("select-all-rules")).toBeInTheDocument()
    })
  })
})
