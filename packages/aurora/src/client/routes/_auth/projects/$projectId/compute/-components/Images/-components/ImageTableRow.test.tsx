import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider, NotificationManager } from "@cloudoperators/juno-ui-components"
import type { GlanceImage } from "@/server/Compute/types/image"
import { ImageTableRow } from "./ImageTableRow"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ projectId: "test-project" }),
  useNavigate: () => mockNavigate,
}))

// Row-scoped tRPC surface: only updateImageMember + useUtils are used.
const mockMutateAsync = vi.fn()
let mockIsPending = false
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      compute: {
        listImagesWithPagination: { invalidate: vi.fn() },
        listSharedImagesByMemberStatus: { invalidate: vi.fn() },
      },
    }),
    compute: {
      updateImageMember: {
        useMutation: () => ({ mutateAsync: mockMutateAsync, isPending: mockIsPending }),
      },
    },
  },
}))

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>
      <NotificationManager />
      {children}
    </PortalProvider>
  </I18nProvider>
)

const noPermissions = {
  canCreate: false,
  canDelete: false,
  canUpdate: false,
  canCreateMember: false,
  canDeleteMember: false,
  canUpdateMember: false,
}

const makeImage = (overrides: Partial<GlanceImage> = {}): GlanceImage =>
  ({
    id: "img-1",
    name: "Ubuntu 24.04",
    status: "active",
    visibility: "private",
    protected: false,
    size: 2048,
    disk_format: "qcow2",
    created_at: "2024-01-01T00:00:00Z",
    owner: "test-project",
    ...overrides,
  }) as GlanceImage

const defaultProps = {
  isPending: false,
  isAccepted: false,
  isSelected: false,
  onEditDetails: vi.fn(),
  onEditMetadata: vi.fn(),
  onDelete: vi.fn(),
  onSelect: vi.fn(),
  onActivationStatusChange: vi.fn(),
  onManageAccess: vi.fn(),
  onUpdateVisibility: vi.fn(),
  onMemberStatusChanged: vi.fn(),
  permissions: noPermissions,
}

const renderRow = (props: Partial<React.ComponentProps<typeof ImageTableRow>> = {}) =>
  render(<ImageTableRow image={makeImage()} {...defaultProps} {...props} />, { wrapper: TestingProvider })

// Opens the row's PopupMenu (its toggle is the only button until items mount).
const openRowMenu = () => fireEvent.click(screen.getByRole("button"))

describe("ImageTableRow", () => {
  beforeAll(() => {
    // jsdom gaps that Headless UI (PopupMenu) and Sonner (NotificationManager) rely on.
    Element.prototype.scrollIntoView = vi.fn()
    if (!window.matchMedia) {
      window.matchMedia = (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    }
    if (!("ResizeObserver" in globalThis)) {
      ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsPending = false
    i18n.activate("en")
  })

  describe("rendering", () => {
    it("renders the image's core fields", () => {
      renderRow({ image: makeImage({ name: "Ubuntu 24.04", status: "active", visibility: "private" }) })

      expect(screen.getByText("Ubuntu 24.04")).toBeInTheDocument()
      expect(screen.getByText("active")).toBeInTheDocument()
      expect(screen.getByText("private")).toBeInTheDocument()
      expect(screen.getByText("qcow2")).toBeInTheDocument()
    })

    it("falls back to 'Unnamed' when the image has no name", () => {
      renderRow({ image: makeImage({ name: "" }) })

      expect(screen.getByText("Unnamed")).toBeInTheDocument()
    })

    it("shows the protected flag as Yes/No", () => {
      const { unmount } = renderRow({ image: makeImage({ protected: true }) })
      expect(screen.getByText("Yes")).toBeInTheDocument()
      unmount()

      renderRow({ image: makeImage({ protected: false }) })
      expect(screen.getByText("No")).toBeInTheDocument()
    })

    it("shows the upload progress instead of the size while uploading", () => {
      renderRow({ image: makeImage({ id: "img-1" }), uploadId: "img-1", uploadProgressPercent: 42 })

      expect(screen.getByText("42%")).toBeInTheDocument()
    })

    it("renders a spinner instead of the menu while a member mutation is pending", () => {
      mockIsPending = true
      renderRow({ isPending: true, permissions: { ...noPermissions, canUpdateMember: true } })

      // The action menu (and therefore its toggle button) is replaced by the spinner.
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
  })

  describe("selection column", () => {
    it("renders a checkbox and reports selection when showSelectColumn is true", () => {
      const onSelect = vi.fn()
      const image = makeImage()
      renderRow({ image, showSelectColumn: true, onSelect })

      fireEvent.click(screen.getByRole("checkbox"))

      expect(onSelect).toHaveBeenCalledWith(image)
    })

    it("omits the checkbox when showSelectColumn is false", () => {
      renderRow({ showSelectColumn: false })

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    })
  })

  describe("row navigation", () => {
    it("navigates to the image detail route when the row is clicked", () => {
      renderRow({ image: makeImage({ id: "img-1" }) })

      fireEvent.click(screen.getByTestId("image-row-img-1"))

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/projects/$projectId/compute/images/$imageId",
          params: expect.objectContaining({ projectId: "test-project", imageId: "img-1" }),
        })
      )
    })
  })

  describe("shared-image member actions", () => {
    it("offers Accept and Reject for a pending external image when canUpdateMember", async () => {
      renderRow({ isPending: true, permissions: { ...noPermissions, canUpdateMember: true } })

      openRowMenu()

      expect(await screen.findByText("Accept")).toBeInTheDocument()
      expect(screen.getByText("Reject")).toBeInTheDocument()
    })

    it("offers only Reject for an already-accepted external image", async () => {
      renderRow({ isAccepted: true, permissions: { ...noPermissions, canUpdateMember: true } })

      openRowMenu()

      expect(await screen.findByText("Reject")).toBeInTheDocument()
      expect(screen.queryByText("Accept")).not.toBeInTheDocument()
    })

    it("shows a success toast and notifies the parent after a successful status change", async () => {
      mockMutateAsync.mockResolvedValueOnce({})
      const onMemberStatusChanged = vi.fn()
      renderRow({
        isPending: true,
        permissions: { ...noPermissions, canUpdateMember: true },
        onMemberStatusChanged,
      })

      openRowMenu()
      fireEvent.click(await screen.findByText("Accept"))

      // The real NotificationManager renders the toast raised by the handler.
      expect(await screen.findByText(/Access status updated to/)).toBeInTheDocument()
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: "test-project", imageId: "img-1", memberId: "test-project" })
      )
      expect(onMemberStatusChanged).toHaveBeenCalledTimes(1)
    })

    it("shows an error toast and does not notify the parent when the status change fails", async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error("Permission denied"))
      const onMemberStatusChanged = vi.fn()
      renderRow({
        isPending: true,
        permissions: { ...noPermissions, canUpdateMember: true },
        onMemberStatusChanged,
      })

      openRowMenu()
      fireEvent.click(await screen.findByText("Reject"))

      expect(await screen.findByText("Permission denied")).toBeInTheDocument()
      expect(onMemberStatusChanged).not.toHaveBeenCalled()
    })
  })

  describe("owned-image actions", () => {
    it("exposes edit/activate/delete actions for an owned image with update+delete permissions", async () => {
      renderRow({
        image: makeImage({ visibility: "private", protected: false }),
        permissions: { ...noPermissions, canUpdate: true, canDelete: true },
      })

      openRowMenu()

      expect(await screen.findByText("Edit Details")).toBeInTheDocument()
      expect(screen.getByText("Edit Metadata")).toBeInTheDocument()
      expect(screen.getByText("Deactivate")).toBeInTheDocument()
      expect(screen.getByText("Delete")).toBeInTheDocument()
    })

    it("hides Delete for a protected image", async () => {
      renderRow({
        image: makeImage({ protected: true }),
        permissions: { ...noPermissions, canUpdate: true, canDelete: true },
      })

      openRowMenu()

      expect(await screen.findByText("Edit Details")).toBeInTheDocument()
      expect(screen.queryByText("Delete")).not.toBeInTheDocument()
    })

    it("forwards Edit Details and Delete clicks to the parent callbacks", async () => {
      const onEditDetails = vi.fn()
      const onDelete = vi.fn()
      const image = makeImage()
      renderRow({
        image,
        permissions: { ...noPermissions, canUpdate: true, canDelete: true },
        onEditDetails,
        onDelete,
      })

      openRowMenu()
      fireEvent.click(await screen.findByText("Edit Details"))
      expect(onEditDetails).toHaveBeenCalledWith(image)

      openRowMenu()
      fireEvent.click(await screen.findByText("Delete"))
      expect(onDelete).toHaveBeenCalledWith(image)
    })

    it("offers 'Set to Shared' for a private image and forwards the visibility change", async () => {
      const onUpdateVisibility = vi.fn()
      renderRow({
        image: makeImage({ id: "img-1", name: "Ubuntu 24.04", visibility: "private" }),
        permissions: { ...noPermissions, canUpdate: true },
        onUpdateVisibility,
      })

      openRowMenu()
      fireEvent.click(await screen.findByText('Set to "Shared"'))

      expect(onUpdateVisibility).toHaveBeenCalledWith("img-1", "shared", "Ubuntu 24.04")
    })
  })
})
