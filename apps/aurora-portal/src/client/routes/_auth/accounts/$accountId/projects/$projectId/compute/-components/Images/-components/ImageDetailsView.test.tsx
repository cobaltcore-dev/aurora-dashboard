import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import "@testing-library/jest-dom"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { GlanceImage } from "@/server/Compute/types/image"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { ImageDetailsView, GeneralImageData, SecuritySection, CustomPropertiesSection } from "./ImageDetailsView"
import { JSX } from "react"

describe("ImageDetailsView", () => {
  const mockImage: GlanceImage = {
    id: "test-id-123",
    name: "Ubuntu 22.04 LTS",
    status: "active",
    visibility: "public",
    size: 2147483648,
    disk_format: "qcow2",
    container_format: "bare",
    min_disk: 10,
    min_ram: 512,
    owner: "owner-id-456",
    protected: false,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-02-20T15:45:00Z",
    checksum: "abc123def456",
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  const setup = (component: JSX.Element) => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>{component}</PortalProvider>
      </I18nProvider>
    )
  }

  describe("GeneralImageData", () => {
    it("should render all general image data fields", () => {
      setup(<GeneralImageData image={mockImage} />)

      expect(screen.getByText("General Image Data")).toBeInTheDocument()
      expect(screen.getByText("ID")).toBeInTheDocument()
      expect(screen.getByText(mockImage.id)).toBeInTheDocument()
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText(`${mockImage.name}`)).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
      expect(screen.getByText("Size")).toBeInTheDocument()
      expect(screen.getByText("Min. Disk")).toBeInTheDocument()
      expect(screen.getByText(`${mockImage.min_disk} GB`)).toBeInTheDocument()
      expect(screen.getByText("Min. RAM")).toBeInTheDocument()
      expect(screen.getByText(`${mockImage.min_ram} MB`)).toBeInTheDocument()
      expect(screen.getByText("Disk Format")).toBeInTheDocument()
      expect(screen.getByText("Container Format")).toBeInTheDocument()
      expect(screen.getByText("Created At")).toBeInTheDocument()
      expect(screen.getByText("Updated At")).toBeInTheDocument()
    })

    it("should render StatusBadge component with correct status", () => {
      setup(<GeneralImageData image={mockImage} />)

      // StatusBadge shows icon and status text for active status
      const statusBadge = screen.getByText(`${mockImage.status}`).parentElement
      expect(statusBadge).toBeInTheDocument()
      expect(screen.getByText(`${mockImage.status}`)).toBeInTheDocument()
    })

    it("should render SizeDisplay component with correct size", () => {
      setup(<GeneralImageData image={mockImage} />)

      // SizeDisplay formats 2147483648 bytes as "2 GB"
      expect(screen.getByText("2 GB")).toBeInTheDocument()
    })

    it("should display disk format in uppercase", () => {
      setup(<GeneralImageData image={mockImage} />)

      const diskFormat = screen.getByText(`${mockImage.disk_format}`)
      expect(diskFormat).toHaveClass("uppercase")
    })

    it("should display container format in uppercase", () => {
      setup(<GeneralImageData image={mockImage} />)

      const containerFormat = screen.getByText(`${mockImage.container_format}`)
      expect(containerFormat).toHaveClass("uppercase")
    })

    it("should format created_at date correctly", () => {
      setup(<GeneralImageData image={mockImage} />)

      const expectedDate = new Date(mockImage.created_at!).toLocaleDateString()
      expect(screen.getByText(expectedDate)).toBeInTheDocument()
    })

    it("should format updated_at date correctly", () => {
      setup(<GeneralImageData image={mockImage} />)

      const expectedDate = new Date(mockImage.updated_at!).toLocaleDateString()
      expect(screen.getByText(expectedDate)).toBeInTheDocument()
    })

    it("should display N/A when created_at is undefined", () => {
      const imageWithoutCreatedAt = { ...mockImage, created_at: undefined }
      setup(<GeneralImageData image={imageWithoutCreatedAt} />)

      expect(screen.getByText("N/A")).toBeInTheDocument()
    })

    it("should display N/A when updated_at is undefined", () => {
      const imageWithoutUpdatedAt = { ...mockImage, updated_at: undefined }
      setup(<GeneralImageData image={imageWithoutUpdatedAt} />)

      expect(screen.getByText("N/A")).toBeInTheDocument()
    })

    it("should render StatusBadge with danger icon for deleted status", () => {
      const deletedImage = { ...mockImage, status: "deleted" }
      setup(<GeneralImageData image={deletedImage} />)

      // Verify the status text is rendered
      expect(screen.getByText("deleted")).toBeInTheDocument()

      // Verify it's in a flex container (StatusBadge structure)
      const statusContainer = screen.getByText("deleted").parentElement
      expect(statusContainer).toHaveClass("flex", "items-center", "space-x-2")
    })

    it("should render StatusBadge with warning icon for queued status", () => {
      const queuedImage = { ...mockImage, status: "queued" }
      setup(<GeneralImageData image={queuedImage} />)

      // Verify the status text is rendered
      expect(screen.getByText("queued")).toBeInTheDocument()

      // Verify it's in a flex container (StatusBadge structure)
      const statusContainer = screen.getByText("queued").parentElement
      expect(statusContainer).toHaveClass("flex", "items-center", "space-x-2")
    })

    it("should render SizeDisplay as N/A when size is undefined", () => {
      const imageWithoutSize = { ...mockImage, size: undefined }
      setup(<GeneralImageData image={imageWithoutSize} />)

      expect(screen.getByText("N/A")).toBeInTheDocument()
    })
  })

  describe("SecuritySection", () => {
    it("should render all security fields", () => {
      setup(<SecuritySection image={mockImage} />)

      expect(screen.getByText("Security")).toBeInTheDocument()
      expect(screen.getByText("Owner")).toBeInTheDocument()
      expect(screen.getByText(`${mockImage.owner}`)).toBeInTheDocument()
      expect(screen.getByText("Visibility")).toBeInTheDocument()
      expect(screen.getByText("Protected")).toBeInTheDocument()
      expect(screen.getByText("Checksum")).toBeInTheDocument()
      expect(screen.getByText(mockImage.checksum!)).toBeInTheDocument()
    })

    it("should render VisibilityBadge component with correct visibility", () => {
      setup(<SecuritySection image={mockImage} />)

      // VisibilityBadge shows icon and visibility text for public visibility
      expect(screen.getByText(`${mockImage.visibility}`)).toBeInTheDocument()

      // Verify it's in a flex container (VisibilityBadge structure)
      const visibilityContainer = screen.getByText(`${mockImage.visibility}`).parentElement
      expect(visibilityContainer).toHaveClass("flex", "items-center", "space-x-2")
    })

    it("should display Yes when protected is true", () => {
      const protectedImage = { ...mockImage, protected: true }
      setup(<SecuritySection image={protectedImage} />)

      expect(screen.getByText("Yes")).toBeInTheDocument()
    })

    it("should display No when protected is false", () => {
      setup(<SecuritySection image={mockImage} />)

      expect(screen.getByText("No")).toBeInTheDocument()
    })

    it("should not render checksum row when checksum is not provided", () => {
      const imageWithoutChecksum = { ...mockImage, checksum: undefined }
      setup(<SecuritySection image={imageWithoutChecksum} />)

      expect(screen.queryByText("Checksum")).not.toBeInTheDocument()
    })

    it("should render checksum row when checksum is provided", () => {
      setup(<SecuritySection image={mockImage} />)

      expect(screen.getByText("Checksum")).toBeInTheDocument()
      expect(screen.getByText(mockImage.checksum!)).toBeInTheDocument()
    })

    it("should render VisibilityBadge with warning icon for private visibility", () => {
      const privateImage = { ...mockImage, visibility: "private" }
      setup(<SecuritySection image={privateImage} />)

      // Verify the visibility text is rendered
      expect(screen.getByText("private")).toBeInTheDocument()

      // Verify it's in a flex container (VisibilityBadge structure)
      const visibilityContainer = screen.getByText("private").parentElement
      expect(visibilityContainer).toHaveClass("flex", "items-center", "space-x-2")
    })

    it("should render VisibilityBadge with success icon for shared visibility", () => {
      const sharedImage = { ...mockImage, visibility: "shared" }
      setup(<SecuritySection image={sharedImage} />)

      // Verify the visibility text is rendered
      expect(screen.getByText("shared")).toBeInTheDocument()

      // Verify it's in a flex container (VisibilityBadge structure)
      const visibilityContainer = screen.getByText("shared").parentElement
      expect(visibilityContainer).toHaveClass("flex", "items-center", "space-x-2")
    })

    it("should render VisibilityBadge with text only for custom visibility", () => {
      const customVisibilityImage = { ...mockImage, visibility: "community" }
      setup(<SecuritySection image={customVisibilityImage} />)

      const textElement = screen.getByText("community")
      expect(textElement).toBeInTheDocument()

      // Verify it's in a flex container
      const visibilityContainer = textElement.parentElement
      expect(visibilityContainer).toHaveClass("flex", "items-center", "space-x-2")
    })
  })

  describe("CustomPropertiesSection", () => {
    it("should render custom properties heading", () => {
      setup(<CustomPropertiesSection image={mockImage} />)

      expect(screen.getByText("Custom Properties / Metadata")).toBeInTheDocument()
    })

    it("should display message when no custom properties exist", () => {
      setup(<CustomPropertiesSection image={mockImage} />)

      expect(screen.getByText("No custom properties defined")).toBeInTheDocument()
    })

    it("should render custom string properties", () => {
      const imageWithCustomProps = {
        ...mockImage,
        custom_field: "custom value",
        another_field: "another value",
      }
      setup(<CustomPropertiesSection image={imageWithCustomProps} />)

      expect(screen.getByText("custom_field")).toBeInTheDocument()
      expect(screen.getByText("custom value")).toBeInTheDocument()
      expect(screen.getByText("another_field")).toBeInTheDocument()
      expect(screen.getByText("another value")).toBeInTheDocument()
    })

    it("should render custom number properties", () => {
      const imageWithCustomProps = {
        ...mockImage,
        custom_number: 42,
      }
      setup(<CustomPropertiesSection image={imageWithCustomProps} />)

      expect(screen.getByText("custom_number")).toBeInTheDocument()
      expect(screen.getByText("42")).toBeInTheDocument()
    })

    it("should render custom boolean properties as True/False", () => {
      const imageWithCustomProps = {
        ...mockImage,
        is_active: true,
        is_deprecated: false,
      }
      setup(<CustomPropertiesSection image={imageWithCustomProps} />)

      expect(screen.getByText("is_active")).toBeInTheDocument()
      expect(screen.getByText("True")).toBeInTheDocument()
      expect(screen.getByText("is_deprecated")).toBeInTheDocument()
      expect(screen.getByText("False")).toBeInTheDocument()
    })

    it("should render null values as 'null'", () => {
      const imageWithCustomProps = {
        ...mockImage,
        nullable_field: null,
      }
      setup(<CustomPropertiesSection image={imageWithCustomProps} />)

      expect(screen.getByText("nullable_field")).toBeInTheDocument()
      expect(screen.getByText("null")).toBeInTheDocument()
    })

    it("should render object properties as JSON string", () => {
      const imageWithCustomProps = {
        ...mockImage,
        metadata_object: { key: "value", nested: { data: "test" } },
      }
      setup(<CustomPropertiesSection image={imageWithCustomProps} />)

      expect(screen.getByText("metadata_object")).toBeInTheDocument()
      expect(screen.getByText('{"key":"value","nested":{"data":"test"}}')).toBeInTheDocument()
    })

    it("should apply break-all class to object values", () => {
      const imageWithCustomProps = {
        ...mockImage,
        metadata_object: { key: "value" },
      }
      const { container } = setup(<CustomPropertiesSection image={imageWithCustomProps} />)

      const objectValue = container.querySelector(".break-all")
      expect(objectValue).toBeInTheDocument()
      expect(objectValue).toHaveTextContent('{"key":"value"}')
    })

    it("should apply break-all class to string values", () => {
      const imageWithCustomProps = {
        ...mockImage,
        long_string: "verylongstringwithoutspaces",
      }
      const { container } = setup(<CustomPropertiesSection image={imageWithCustomProps} />)

      const stringValue = container.querySelector(".break-all")
      expect(stringValue).toBeInTheDocument()
    })

    it("should not display known fields as custom properties", () => {
      setup(<CustomPropertiesSection image={mockImage} />)

      // These should not appear in the custom properties section
      expect(screen.queryByText("id")).not.toBeInTheDocument()
      expect(screen.queryByText("status")).not.toBeInTheDocument()
      expect(screen.queryByText("visibility")).not.toBeInTheDocument()
      expect(screen.queryByText("owner")).not.toBeInTheDocument()
    })

    it("should sort custom properties alphabetically", () => {
      const imageWithCustomProps = {
        ...mockImage,
        zebra_prop: "z",
        alpha_prop: "a",
        beta_prop: "b",
      }
      const { container } = setup(<CustomPropertiesSection image={imageWithCustomProps} />)

      const headCells = container.querySelectorAll("[class*='juno-datagrid-cell']")

      const headCellTexts = Array.from(headCells)
        .map((cell) => cell.textContent)
        .filter((text) => ["alpha_prop", "beta_prop", "zebra_prop"].includes(text || ""))

      expect(headCellTexts).toEqual(["alpha_prop", "beta_prop", "zebra_prop"])
    })
  })

  describe("ImageDetailsView", () => {
    it("should render all three sections", () => {
      setup(<ImageDetailsView image={mockImage} />)

      expect(screen.getByText("General Image Data")).toBeInTheDocument()
      expect(screen.getByText("Security")).toBeInTheDocument()
      expect(screen.getByText("Custom Properties / Metadata")).toBeInTheDocument()
    })

    it("should render sections in correct order", () => {
      const { container } = setup(<ImageDetailsView image={mockImage} />)

      const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6")
      const headingTexts = Array.from(headings).map((h) => h.textContent)

      expect(headingTexts).toEqual(["General Image Data", "Security", "Custom Properties / Metadata"])
    })

    it("should pass image prop to all child components", () => {
      setup(<ImageDetailsView image={mockImage} />)

      // Verify that data from all sections is rendered
      expect(screen.getByText(mockImage.id)).toBeInTheDocument()
      expect(screen.getByText(`${mockImage.name}`)).toBeInTheDocument()
      expect(screen.getByText(`${mockImage.owner}`)).toBeInTheDocument()
    })

    it("should integrate StatusBadge, SizeDisplay, and VisibilityBadge correctly", () => {
      setup(<ImageDetailsView image={mockImage} />)

      // Verify StatusBadge integration - active status is rendered
      expect(screen.getByText("active")).toBeInTheDocument()
      const statusContainer = screen.getByText("active").parentElement
      expect(statusContainer).toHaveClass("flex", "items-center", "space-x-2")

      // Verify SizeDisplay integration (2147483648 bytes = 2 GB)
      expect(screen.getByText("2 GB")).toBeInTheDocument()

      // Verify VisibilityBadge integration - public visibility is rendered
      expect(screen.getByText("public")).toBeInTheDocument()
      const visibilityContainer = screen.getByText("public").parentElement
      expect(visibilityContainer).toHaveClass("flex", "items-center", "space-x-2")
    })

    it("should render complete image details with all component integrations", () => {
      const complexImage = {
        ...mockImage,
        status: "queued",
        visibility: "private",
        size: 1073741824, // 1 GB
        custom_property: "custom value",
        os_version: "22.04",
      }

      setup(<ImageDetailsView image={complexImage} />)

      // StatusBadge shows queued status
      expect(screen.getByText("queued")).toBeInTheDocument()
      const statusContainer = screen.getByText("queued").parentElement
      expect(statusContainer).toHaveClass("flex", "items-center", "space-x-2")

      // VisibilityBadge shows private visibility
      expect(screen.getByText("private")).toBeInTheDocument()
      const visibilityContainer = screen.getByText("private").parentElement
      expect(visibilityContainer).toHaveClass("flex", "items-center", "space-x-2")

      // SizeDisplay formats size correctly
      expect(screen.getByText("1 GB")).toBeInTheDocument()

      // Custom properties are displayed
      expect(screen.getByText("custom_property")).toBeInTheDocument()
      expect(screen.getByText("custom value")).toBeInTheDocument()
      expect(screen.getByText("os_version")).toBeInTheDocument()
      expect(screen.getByText("22.04")).toBeInTheDocument()
    })
  })
})
