import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
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
  hasAnyBulkAction: true,
}

describe("ImageListView — pagination", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
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

    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument()
  })

  it("renders pagination when totalPages is greater than 1", async () => {
    const images = makeImages(50)

    await act(async () => {
      render(<ImageListView {...defaultProps} images={images} currentPage={1} totalPages={3} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
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

  it("clamps currentPage to totalPages when currentPage exceeds totalPages", async () => {
    const images = makeImages(50)

    await act(async () => {
      render(
        <ImageListView {...defaultProps} images={images} currentPage={5} totalPages={3} onPageChange={vi.fn()} />,
        { wrapper: TestingProvider }
      )
    })

    // When currentPage > totalPages the next button should be disabled (last page)
    const nextButton = screen.getByRole("button", { name: /next/i })
    expect(nextButton).toBeDisabled()
  })
})

describe("ImageListView — bulk selection", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders select-all checkbox in table header when hasAnyBulkAction is true", async () => {
    const images = makeImages(3)

    await act(async () => {
      render(<ImageListView {...defaultProps} images={images} hasAnyBulkAction={true} />, {
        wrapper: TestingProvider,
      })
    })

    const checkboxes = screen.getAllByRole("checkbox")
    // header checkbox + one per row = 4 total
    expect(checkboxes).toHaveLength(4)
  })

  it("does not render select-all checkbox or per-row checkboxes when hasAnyBulkAction is false", async () => {
    const images = makeImages(3)

    await act(async () => {
      render(<ImageListView {...defaultProps} images={images} hasAnyBulkAction={false} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("clicking a per-row checkbox calls setSelectedImages with that image id", async () => {
    const setSelectedImages = vi.fn()
    const images = makeImages(3)

    await act(async () => {
      render(
        <ImageListView
          {...defaultProps}
          images={images}
          hasAnyBulkAction={true}
          selectedImages={[]}
          setSelectedImages={setSelectedImages}
        />,
        { wrapper: TestingProvider }
      )
    })

    const checkboxes = screen.getAllByRole("checkbox")
    // index 0 = select-all, index 1 = first row
    await act(async () => {
      fireEvent.click(checkboxes[1])
    })

    expect(setSelectedImages).toHaveBeenCalledWith(["image-1"])
  })

  it("clicking select-all selects all images on the page", async () => {
    const setSelectedImages = vi.fn()
    const images = makeImages(3)

    await act(async () => {
      render(
        <ImageListView
          {...defaultProps}
          images={images}
          hasAnyBulkAction={true}
          selectedImages={[]}
          setSelectedImages={setSelectedImages}
        />,
        { wrapper: TestingProvider }
      )
    })

    const [selectAll] = screen.getAllByRole("checkbox")
    await act(async () => {
      fireEvent.click(selectAll)
    })

    expect(setSelectedImages).toHaveBeenCalledWith(
      expect.arrayContaining(["image-1", "image-2", "image-3"])
    )
    expect(setSelectedImages.mock.calls[0][0]).toHaveLength(3)
  })

  it("clicking select-all when all are selected deselects all images", async () => {
    const setSelectedImages = vi.fn()
    const images = makeImages(3)

    await act(async () => {
      render(
        <ImageListView
          {...defaultProps}
          images={images}
          hasAnyBulkAction={true}
          selectedImages={["image-1", "image-2", "image-3"]}
          setSelectedImages={setSelectedImages}
        />,
        { wrapper: TestingProvider }
      )
    })

    const [selectAll] = screen.getAllByRole("checkbox")
    await act(async () => {
      fireEvent.click(selectAll)
    })

    expect(setSelectedImages).toHaveBeenCalledWith([])
  })
})

describe("ImageListView — permission-gated actions", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the actions popup when hasAnyBulkAction is true", async () => {
    await act(async () => {
      render(<ImageListView {...defaultProps} images={makeImages(1)} hasAnyBulkAction={true} />, {
        wrapper: TestingProvider,
      })
    })
    // The per-row checkbox is the clearest indicator the column is present
    expect(screen.getAllByRole("checkbox")).toHaveLength(2) // header + 1 row
  })

  it("does not render the actions column or checkboxes when hasAnyBulkAction is false", async () => {
    await act(async () => {
      render(<ImageListView {...defaultProps} images={makeImages(3)} hasAnyBulkAction={false} />, {
        wrapper: TestingProvider,
      })
    })
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("still renders the table rows when hasAnyBulkAction is false", async () => {
    const images = makeImages(3)
    await act(async () => {
      render(<ImageListView {...defaultProps} images={images} hasAnyBulkAction={false} />, {
        wrapper: TestingProvider,
      })
    })
    expect(screen.getByText("Image 1")).toBeInTheDocument()
    expect(screen.getByText("Image 3")).toBeInTheDocument()
  })
})
