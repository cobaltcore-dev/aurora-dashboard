import React from "react"
import { describe, test, expect, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider, toast } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ContainerHeader } from "./ContainerHeader"

// ─── Mock the Juno toast API ──────────────────────────────────────────────────

vi.mock("@cloudoperators/juno-ui-components", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cloudoperators/juno-ui-components")>()
  return {
    ...actual,
    toast: Object.assign(actual.toast, { success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
  }
})

// ─── Mock @tanstack/react-router (useParams + useNavigate only) ───────────────

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useParams: vi.fn(() => ({
      projectId: "test-project",
      provider: "swift",
      storageType: "containers",
    })),
    useNavigate: () => mockNavigate,
  }
})

// ─── Mock ContentHeader (avoid its own router-context/slot plumbing) ──────────

vi.mock("@/client/components/ContentHeader/ContentHeader", () => ({
  ContentHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <div data-testid="content-header">
      <span data-testid="content-header-title">{title}</span>
      {actions}
    </div>
  ),
}))

// ─── Mock tRPC ────────────────────────────────────────────────────────────────

let mockContainerMetadata:
  | {
      objectCount: number
      bytesUsed: number
    }
  | undefined = undefined

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      swift: {
        getContainerMetadata: {
          useQuery: () => ({ data: mockContainerMetadata }),
        },
      },
    },
  },
}))

// ─── Mock the four modals with lightweight stubs exposing what they received ──

vi.mock("./ManageContainerAccessModal", () => ({
  ManageContainerAccessModal: ({
    isOpen,
    container,
    onSuccess,
    onError,
  }: {
    isOpen: boolean
    container: { name: string; count: number; bytes: number } | null
    onSuccess?: (name: string) => void
    onError?: (name: string, message: string) => void
  }) =>
    isOpen ? (
      <div data-testid="manage-access-modal">
        <span data-testid="manage-access-modal-container">
          {container?.name}:{container?.count}:{container?.bytes}
        </span>
        <button onClick={() => onSuccess?.(container!.name)}>SimulateAclSuccess</button>
        <button onClick={() => onError?.(container!.name, "acl failed")}>SimulateAclError</button>
      </div>
    ) : null,
}))

vi.mock("./EditContainerMetadataModal", () => ({
  EditContainerMetadataModal: ({
    isOpen,
    container,
    onSuccess,
  }: {
    isOpen: boolean
    container: { name: string; count: number; bytes: number } | null
    onSuccess?: (name: string) => void
  }) =>
    isOpen ? (
      <div data-testid="edit-metadata-modal">
        <span data-testid="edit-metadata-modal-container">
          {container?.name}:{container?.count}:{container?.bytes}
        </span>
        <button onClick={() => onSuccess?.(container!.name)}>SimulateEditSuccess</button>
      </div>
    ) : null,
}))

vi.mock("./EmptyContainerModal", () => ({
  EmptyContainerModal: ({
    isOpen,
    container,
    onSuccess,
    onError,
  }: {
    isOpen: boolean
    container: { name: string; count: number; bytes: number } | null
    onSuccess?: (name: string, deletedCount: number) => void
    onError?: (name: string, message: string) => void
  }) =>
    isOpen ? (
      <div data-testid="empty-container-modal">
        <span data-testid="empty-container-modal-container">
          {container?.name}:{container?.count}:{container?.bytes}
        </span>
        <button onClick={() => onSuccess?.(container!.name, 3)}>SimulateEmptySuccess</button>
        <button onClick={() => onError?.(container!.name, "empty failed")}>SimulateEmptyError</button>
      </div>
    ) : null,
}))

vi.mock("./DeleteContainerModal", () => ({
  DeleteContainerModal: ({
    isOpen,
    container,
    onSuccess,
    onError,
  }: {
    isOpen: boolean
    container: { name: string; count: number; bytes: number } | null
    onSuccess?: (name: string) => void
    onError?: (name: string, message: string) => void
  }) =>
    isOpen ? (
      <div data-testid="delete-container-modal">
        <span data-testid="delete-container-modal-container">
          {container?.name}:{container?.count}:{container?.bytes}
        </span>
        <button onClick={() => onSuccess?.(container!.name)}>SimulateDeleteSuccess</button>
        <button onClick={() => onError?.(container!.name, "delete failed")}>SimulateDeleteError</button>
      </div>
    ) : null,
}))

const renderHeader = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ContainerHeader containerName="alpha" />
      </PortalProvider>
    </I18nProvider>
  )

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Container actions" }))
}

describe("ContainerHeader", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockContainerMetadata = undefined
  })

  test("renders the container name as the title", () => {
    renderHeader()
    expect(screen.getByTestId("content-header-title")).toHaveTextContent("alpha")
  })

  test("does not render the actions menu while getContainerMetadata has no data", () => {
    mockContainerMetadata = undefined
    renderHeader()
    expect(screen.queryByRole("button", { name: "Container actions" })).not.toBeInTheDocument()
  })

  test("renders the actions menu once container metadata resolves", () => {
    mockContainerMetadata = { objectCount: 5, bytesUsed: 1024 }
    renderHeader()
    expect(screen.getByRole("button", { name: "Container actions" })).toBeInTheDocument()
  })

  describe("once metadata has resolved", () => {
    beforeEach(() => {
      mockContainerMetadata = { objectCount: 7, bytesUsed: 2048 }
    })

    test("clicking 'Manage Access' opens ManageContainerAccessModal with real count/bytes", async () => {
      const user = userEvent.setup()
      renderHeader()
      await openMenu(user)
      await user.click(screen.getByTestId("container-actions-manage-access"))

      expect(screen.getByTestId("manage-access-modal")).toBeInTheDocument()
      expect(screen.getByTestId("manage-access-modal-container")).toHaveTextContent("alpha:7:2048")
      expect(screen.queryByTestId("edit-metadata-modal")).not.toBeInTheDocument()
      expect(screen.queryByTestId("empty-container-modal")).not.toBeInTheDocument()
      expect(screen.queryByTestId("delete-container-modal")).not.toBeInTheDocument()
    })

    test("clicking 'Preview and Edit metadata' opens EditContainerMetadataModal with real count/bytes", async () => {
      const user = userEvent.setup()
      renderHeader()
      await openMenu(user)
      await user.click(screen.getByTestId("container-actions-edit-metadata"))

      expect(screen.getByTestId("edit-metadata-modal")).toBeInTheDocument()
      expect(screen.getByTestId("edit-metadata-modal-container")).toHaveTextContent("alpha:7:2048")
    })

    test("clicking 'Empty Container' opens EmptyContainerModal with real count/bytes", async () => {
      const user = userEvent.setup()
      renderHeader()
      await openMenu(user)
      await user.click(screen.getByTestId("container-actions-empty"))

      expect(screen.getByTestId("empty-container-modal")).toBeInTheDocument()
      expect(screen.getByTestId("empty-container-modal-container")).toHaveTextContent("alpha:7:2048")
    })

    test("clicking 'Delete Container' opens DeleteContainerModal with real count/bytes", async () => {
      const user = userEvent.setup()
      renderHeader()
      await openMenu(user)
      await user.click(screen.getByTestId("container-actions-delete"))

      expect(screen.getByTestId("delete-container-modal")).toBeInTheDocument()
      expect(screen.getByTestId("delete-container-modal-container")).toHaveTextContent("alpha:7:2048")
    })

    test("delete success shows a toast and navigates back to the container list", async () => {
      const user = userEvent.setup()
      renderHeader()
      await openMenu(user)
      await user.click(screen.getByTestId("container-actions-delete"))
      await user.click(screen.getByRole("button", { name: "SimulateDeleteSuccess" }))

      expect(toast.success).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/storage/$provider/$storageType",
        params: { projectId: "test-project", provider: "swift", storageType: "containers" },
      })
    })

    test("delete error shows a toast and does not navigate", async () => {
      const user = userEvent.setup()
      renderHeader()
      await openMenu(user)
      await user.click(screen.getByTestId("container-actions-delete"))
      await user.click(screen.getByRole("button", { name: "SimulateDeleteError" }))

      expect(toast.error).toHaveBeenCalledTimes(1)
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    test("empty success shows a toast and does not navigate", async () => {
      const user = userEvent.setup()
      renderHeader()
      await openMenu(user)
      await user.click(screen.getByTestId("container-actions-empty"))
      await user.click(screen.getByRole("button", { name: "SimulateEmptySuccess" }))

      expect(toast.success).toHaveBeenCalledTimes(1)
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    test("manage access success/error dispatch the ACL toasts", async () => {
      const user = userEvent.setup()
      renderHeader()
      await openMenu(user)
      await user.click(screen.getByTestId("container-actions-manage-access"))
      await user.click(screen.getByRole("button", { name: "SimulateAclSuccess" }))

      expect(toast.success).toHaveBeenCalledTimes(1)
    })

    test("edit metadata success dispatches the update toast", async () => {
      const user = userEvent.setup()
      renderHeader()
      await openMenu(user)
      await user.click(screen.getByTestId("container-actions-edit-metadata"))
      await user.click(screen.getByRole("button", { name: "SimulateEditSuccess" }))

      expect(toast.success).toHaveBeenCalledTimes(1)
    })
  })
})
