import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { ImageListView } from "./ImageListView"
import type { GlanceImage } from "@/server/Compute/types/image"
import { ReactNode } from "react"

vi.mock("@/client/hooks", () => ({
  useProjectId: vi.fn(() => "test-project-id"),
}))

const mockMutation = { mutateAsync: vi.fn(), isPending: false }
const mockUtils = {
  compute: {
    listImagesWithPagination: { invalidate: vi.fn() },
    getImageById: { invalidate: vi.fn(), setData: vi.fn() },
  },
}

vi.mock("@/client/trpcClient", () => ({
  trpcClient: {
    compute: {
      uploadImage: { mutate: vi.fn() },
    },
  },
  trpcReact: {
    useUtils: () => mockUtils,
    compute: {
      deleteImage: { useMutation: () => mockMutation },
      deactivateImage: { useMutation: () => mockMutation },
      reactivateImage: { useMutation: () => mockMutation },
      deleteImages: { useMutation: () => mockMutation },
      activateImages: { useMutation: () => mockMutation },
      deactivateImages: { useMutation: () => mockMutation },
      updateImage: { useMutation: () => mockMutation },
      createImage: { useMutation: () => mockMutation },
      updateImageVisibility: { useMutation: () => mockMutation },
      updateImageMember: { useMutation: () => mockMutation },
      watchUploadProgress: { useSubscription: () => ({ data: undefined }) },
    },
  },
}))

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const mockPermissions = {
  canCreate: false,
  canDelete: false,
  canUpdate: false,
  canCreateMember: false,
  canDeleteMember: false,
  canUpdateMember: false,
}

const makeImage = (i: number): GlanceImage =>
  ({
    id: `image-${i}`,
    name: `Image ${i}`,
    status: "active",
    visibility: "private",
    disk_format: "qcow2",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    size: 1024,
  }) as GlanceImage

const makeImages = (count: number): GlanceImage[] => Array.from({ length: count }, (_, i) => makeImage(i + 1))

const defaultProps = {
  suggestedImages: [],
  acceptedImages: [],
  permissions: mockPermissions,
  selectedImages: [],
  setSelectedImages: vi.fn(),
  deleteAllModalOpen: false,
  setDeleteAllModalOpen: vi.fn(),
  deactivateAllModalOpen: false,
  setDeactivateAllModalOpen: vi.fn(),
  activateAllModalOpen: false,
  setActivateAllModalOpen: vi.fn(),
  createModalOpen: false,
  setCreateModalOpen: vi.fn(),
  deletableImages: [],
  protectedImages: [],
  activeImages: [],
  deactivatedImages: [],
  onImageUpdated: vi.fn(),
  onImageDeleted: vi.fn(),
  onMemberStatusChanged: vi.fn(),
}

describe("ImageListView — pagination", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders 'no images' message when images array is empty", async () => {
    await act(async () => {
      render(<ImageListView {...defaultProps} images={[]} />, { wrapper: TestingProvider })
    })

    expect(screen.getByText("No images found")).toBeInTheDocument()
    expect(screen.queryByTestId("images-table")).not.toBeInTheDocument()
  })

  it("renders all images when there are fewer than 50", async () => {
    const images = makeImages(10)

    await act(async () => {
      render(<ImageListView {...defaultProps} images={images} currentPage={1} totalPages={1} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.getByText("Image 1")).toBeInTheDocument()
    expect(screen.getByText("Image 10")).toBeInTheDocument()
  })

  it("does not render pagination when there is only one page", async () => {
    const images = makeImages(10)

    await act(async () => {
      render(<ImageListView {...defaultProps} images={images} currentPage={1} totalPages={1} />, {
        wrapper: TestingProvider,
      })
    })

    expect(document.querySelector(".juno-pagination")).not.toBeInTheDocument()
  })

  it("renders pagination when totalPages is greater than 1", async () => {
    const images = makeImages(50)

    await act(async () => {
      render(<ImageListView {...defaultProps} images={images} currentPage={1} totalPages={3} />, {
        wrapper: TestingProvider,
      })
    })

    expect(document.querySelector(".juno-pagination")).toBeInTheDocument()
  })

  it("calls onPageChange with next page when next button is clicked", async () => {
    const onPageChange = vi.fn()
    const images = makeImages(50)

    await act(async () => {
      render(
        <ImageListView {...defaultProps} images={images} currentPage={1} totalPages={3} onPageChange={onPageChange} />,
        { wrapper: TestingProvider }
      )
    })

    const nextButton = screen.getByRole("button", { name: /next/i })
    await act(async () => {
      fireEvent.click(nextButton)
    })

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it("calls onPageChange with previous page when previous button is clicked", async () => {
    const onPageChange = vi.fn()
    const images = makeImages(50)

    await act(async () => {
      render(
        <ImageListView {...defaultProps} images={images} currentPage={2} totalPages={3} onPageChange={onPageChange} />,
        { wrapper: TestingProvider }
      )
    })

    const prevButton = screen.getByRole("button", { name: /previous/i })
    await act(async () => {
      fireEvent.click(prevButton)
    })

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it("previous button is disabled on the first page", async () => {
    const images = makeImages(50)

    await act(async () => {
      render(
        <ImageListView {...defaultProps} images={images} currentPage={1} totalPages={3} onPageChange={vi.fn()} />,
        { wrapper: TestingProvider }
      )
    })

    const prevButton = screen.getByRole("button", { name: /previous/i })
    expect(prevButton).toBeDisabled()
  })

  it("next button is disabled on the last page", async () => {
    const images = makeImages(50)

    await act(async () => {
      render(
        <ImageListView {...defaultProps} images={images} currentPage={3} totalPages={3} onPageChange={vi.fn()} />,
        { wrapper: TestingProvider }
      )
    })

    const nextButton = screen.getByRole("button", { name: /next/i })
    expect(nextButton).toBeDisabled()
  })
})
