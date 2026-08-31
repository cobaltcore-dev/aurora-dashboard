import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { ReactElement, ReactNode } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider, NotificationManager } from "@cloudoperators/juno-ui-components"

// Only non-Juno modules are mocked. Juno (Stack/Spinner/Button and the real
// NotificationManager) renders for real, so the member-status handler surfaces
// as an actual toast we assert against.

// Mutable mock state, initialized before the hoisted vi.mock factories run.
const h = vi.hoisted(() => ({
  getImageByIdResult: { data: undefined as unknown, status: "pending", error: null as unknown },
  canUserResult: { data: [false, false, false, false, false] as boolean[] | undefined },
  getImageMemberResult: { data: undefined as unknown },
  updateMemberMutateAsync: vi.fn(),
  navigate: vi.fn(),
}))

// The route file only exports `Route`; capture the options to render the
// component under test, and stub the router hooks it reads.
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useParams: () => ({ projectId: "p1", imageId: "img-1" }),
  useSearch: () => ({ tab: undefined }),
  useNavigate: () => h.navigate,
  redirect: vi.fn(),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      compute: {
        getImageById: { setData: vi.fn(), invalidate: vi.fn() },
        listImagesWithPagination: { invalidate: vi.fn() },
        getImageMember: { invalidate: vi.fn() },
        listImageMembers: { invalidate: vi.fn() },
        listSharedImagesByMemberStatus: { invalidate: vi.fn() },
      },
    }),
    compute: {
      getImageById: { useQuery: () => h.getImageByIdResult },
      canUser: { useQuery: () => h.canUserResult },
      getImageMember: { useQuery: () => h.getImageMemberResult },
      updateImage: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      deleteImage: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      deactivateImage: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      reactivateImage: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      updateImageVisibility: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      updateImageMember: { useMutation: () => ({ mutateAsync: h.updateMemberMutateAsync, isPending: false }) },
    },
  },
}))

// App components (not Juno) are stubbed. ImageDetailsView exposes a button that
// invokes the member-status handler so we can drive it without the header menu.
vi.mock("../-components/Images/-components/ImageDetailsView", () => ({
  ImageDetailsView: ({ onMemberStatusChange }: { onMemberStatusChange: (s: string) => void }) => (
    <button type="button" onClick={() => onMemberStatusChange("rejected")}>
      trigger-member-change
    </button>
  ),
}))
vi.mock("@/client/components/ContentHeader/ContentHeader", () => ({
  ContentHeader: ({ title }: { title: string }) => <div>{title}</div>,
}))
vi.mock("../-components/Images/-components/EditImageDetailsModal", () => ({ EditImageDetailsModal: () => null }))
vi.mock("../-components/Images/-components/EditImageMetadataModal", () => ({ EditImageMetadataModal: () => null }))
vi.mock("../-components/Images/-components/DeleteImageModal", () => ({ DeleteImageModal: () => null }))
vi.mock("../-components/Images/-components/ActivateImageModal", () => ({ ActivateImageModal: () => null }))
vi.mock("../-components/Images/-components/DeactivateImageModal", () => ({ DeactivateImageModal: () => null }))
vi.mock("@/server/Authentication/helpers", () => ({ getServiceIndex: vi.fn() }))

import { Route } from "./$imageId"

const RouteComponent = (Route as unknown as { options: { component: () => ReactElement } }).options.component

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>
      <NotificationManager />
      {children}
    </PortalProvider>
  </I18nProvider>
)

const renderRoute = () => render(<RouteComponent />, { wrapper: TestingProvider })

const successImage = {
  id: "img-1",
  name: "Ubuntu 24.04",
  status: "active",
  visibility: "private",
  owner: "p1",
  protected: false,
}

describe("RouteComponent (image detail)", () => {
  beforeAll(() => {
    // jsdom gaps that Sonner (NotificationManager) relies on.
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn()
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
  })

  beforeEach(() => {
    vi.clearAllMocks()
    h.getImageByIdResult = { data: undefined, status: "pending", error: null }
    h.canUserResult = { data: [false, false, false, false, false] }
    h.getImageMemberResult = { data: undefined }
    i18n.activate("en")
  })

  describe("query states", () => {
    it("renders a loading state while the image query is pending", () => {
      h.getImageByIdResult = { data: undefined, status: "pending", error: null }

      renderRoute()

      expect(screen.getByText("Loading Image Details...")).toBeInTheDocument()
    })

    it("renders an error state with the error message", () => {
      h.getImageByIdResult = { data: undefined, status: "error", error: { message: "Boom" } }

      renderRoute()

      expect(screen.getByText("Error loading image")).toBeInTheDocument()
      expect(screen.getByText("Boom")).toBeInTheDocument()
    })

    it("renders a not-found state when the query succeeds without data", () => {
      h.getImageByIdResult = { data: undefined, status: "success", error: null }

      renderRoute()

      expect(screen.getByText("Image not found")).toBeInTheDocument()
    })

    it("renders the detail view once the image has loaded", () => {
      h.getImageByIdResult = { data: successImage, status: "success", error: null }

      renderRoute()

      expect(screen.getByText("Ubuntu 24.04")).toBeInTheDocument()
      expect(screen.getByText("trigger-member-change")).toBeInTheDocument()
    })
  })

  describe("member status change", () => {
    beforeEach(() => {
      h.getImageByIdResult = { data: successImage, status: "success", error: null }
    })

    it("shows a success toast after a successful status change", async () => {
      h.updateMemberMutateAsync.mockResolvedValueOnce({})

      renderRoute()
      fireEvent.click(screen.getByText("trigger-member-change"))

      expect(await screen.findByText("Access Status")).toBeInTheDocument()
      expect(screen.getByText('Access status updated to "rejected".')).toBeInTheDocument()
      expect(h.updateMemberMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: "p1", imageId: "img-1", memberId: "p1", status: "rejected" })
      )
    })

    it("shows an error toast when the status change fails", async () => {
      h.updateMemberMutateAsync.mockRejectedValueOnce(new Error("Permission denied"))

      renderRoute()
      fireEvent.click(screen.getByText("trigger-member-change"))

      expect(await screen.findByText("Access Status")).toBeInTheDocument()
      expect(await screen.findByText("Permission denied")).toBeInTheDocument()
    })
  })
})
