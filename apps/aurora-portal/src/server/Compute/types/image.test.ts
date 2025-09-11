import { describe, it, expect } from "vitest"
import {
  imageSchema,
  imageResponseSchema,
  imageDetailResponseSchema,
  imageMemberSchema,
  imageMembersResponseSchema,
  listImagesInputSchema,
  getImageByIdInputSchema,
  createImageInputSchema,
  uploadImageInputSchema,
  updateImageInputSchema,
  updateImageVisibilityInputSchema,
  deleteImageInputSchema,
  deactivateImageInputSchema,
  reactivateImageInputSchema,
  imagesPaginatedInputSchema,
  imagesPaginatedResponseSchema,
  memberStatusSchema,
  sortKeySchema,
  sortDirSchema,
  imageVisibilityEnumSchema,
  listImageMembersInputSchema,
  getImageMemberInputSchema,
  createImageMemberInputSchema,
  updateImageMemberInputSchema,
  deleteImageMemberInputSchema,
} from "./image"

describe("Glance Image Schema Validation", () => {
  // Using a simple, known-good UUID
  const imageId = "123e4567-e89b-12d3-a456-426614174000"
  const projectId = "project-123"

  // Valid minimal image data
  const minimalValidImage = {
    id: imageId,
  }

  // Complete image data with all fields
  const completeValidImage = {
    id: imageId,
    name: "Ubuntu 20.04",
    status: "active",
    visibility: "public",
    protected: true,
    checksum: "abcd1234",
    container_format: "bare",
    disk_format: "qcow2",
    min_ram: 512,
    min_disk: 1,
    size: 1073741824, // 1GB
    virtual_size: 2147483648, // 2GB
    created_at: "2025-03-01T12:00:00Z",
    updated_at: "2025-03-02T12:00:00Z",
    deleted_at: null,
    owner: "project-123",
    os_hidden: false,
    os_hash_algo: "sha256",
    os_hash_value: "deadbeef1234567890",
    schema: "/v2/schemas/image",
    metadata: {
      architecture: "x86_64",
      hypervisor_type: "kvm",
    },
    file: `/v2/images/${imageId}/file`,
    self: `/v2/images/${imageId}`,
    tags: ["ubuntu", "lts", "20.04"],
    direct_url: `swift+config://ref1/glance/${imageId}`,
    hw_disk_bus: "virtio",
    hw_scsi_model: "virtio-scsi",
    hw_serial: "ds=nocloud-net",
    hw_qemu_guest_agent: true,
    hw_vif_model: "virtio",
    hw_rng_model: "virtio",
    hw_machine_type: "pc-i440fx-2.11",
    os_type: "linux",
    os_distro: "ubuntu",
    os_version: "20.04",
    os_require_quiesce: false,
    links: [
      {
        href: `https://example.com/v2/images/${imageId}`,
        rel: "self",
      },
    ],
    members: ["project-456", "project-789"],
    locations: [
      {
        url: `swift+config://ref1/glance/${imageId}`,
        metadata: { store: "swift" },
      },
    ],
  }

  describe("Image Schema", () => {
    it("should validate a minimal valid image", () => {
      const result = imageSchema.safeParse(minimalValidImage)
      expect(result.success).toBe(true)
    })

    it("should validate a complete valid image", () => {
      const result = imageSchema.safeParse(completeValidImage)
      expect(result.success).toBe(true)
    })

    it("should reject an image without an id", () => {
      const invalidImage = { name: "Invalid Image" }
      const result = imageSchema.safeParse(invalidImage)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("id")
      }
    })

    it("should validate all status values", () => {
      const validStatuses = [
        "queued",
        "saving",
        "active",
        "killed",
        "deleted",
        "pending_delete",
        "deactivated",
        "importing",
      ]

      for (const status of validStatuses) {
        const image = { ...minimalValidImage, status }
        const result = imageSchema.safeParse(image)
        expect(result.success).toBe(true)
      }
    })

    it("should validate with unknown status values (fallback to string)", () => {
      const image = { ...minimalValidImage, status: "some_future_status" }
      const result = imageSchema.safeParse(image)
      expect(result.success).toBe(true)
    })

    it("should validate all visibility values", () => {
      const validVisibilities = ["public", "private", "shared", "community"]

      for (const visibility of validVisibilities) {
        const image = { ...minimalValidImage, visibility }
        const result = imageSchema.safeParse(image)
        expect(result.success).toBe(true)
      }
    })

    it("should validate all container formats", () => {
      const validFormats = ["bare", "ovf", "ova", "docker", "ami", "ari", "aki", "compressed"]

      for (const format of validFormats) {
        const image = { ...minimalValidImage, container_format: format }
        const result = imageSchema.safeParse(image)
        expect(result.success).toBe(true)
      }
    })

    it("should validate all disk formats", () => {
      const validFormats = ["ami", "ari", "aki", "vhd", "vhdx", "vmdk", "raw", "qcow2", "vdi", "iso", "ploop"]

      for (const format of validFormats) {
        const image = { ...minimalValidImage, disk_format: format }
        const result = imageSchema.safeParse(image)
        expect(result.success).toBe(true)
      }
    })

    it("should validate OS types", () => {
      const validOSTypes = ["linux", "windows"]

      for (const osType of validOSTypes) {
        const image = { ...minimalValidImage, os_type: osType }
        const result = imageSchema.safeParse(image)
        expect(result.success).toBe(true)
      }
    })

    it("should validate null for optional nullable fields", () => {
      const image = {
        ...minimalValidImage,
        name: null,
        checksum: null,
        disk_format: null,
        container_format: null,
        virtual_size: null,
        deleted_at: null,
        owner: null,
        os_hash_algo: null,
        os_hash_value: null,
        direct_url: null,
        hw_disk_bus: null,
        hw_scsi_model: null,
        hw_serial: null,
        hw_vif_model: null,
        hw_rng_model: null,
        hw_machine_type: null,
        os_type: null,
        os_distro: null,
        os_version: null,
      }
      const result = imageSchema.safeParse(image)
      expect(result.success).toBe(true)
    })

    it("should validate with unexpected extra properties", () => {
      const image = {
        ...minimalValidImage,
        some_future_property: "value",
        another_property: 123,
      }
      const result = imageSchema.safeParse(image)
      expect(result.success).toBe(true)
    })

    it("should validate locations array", () => {
      const image = {
        ...minimalValidImage,
        locations: [
          { url: "swift://container/object" },
          { url: "file:///var/lib/glance/images/123", metadata: { store: "file" } },
        ],
      }
      const result = imageSchema.safeParse(image)
      expect(result.success).toBe(true)
    })
  })

  describe("Response Schemas", () => {
    it("should validate image response with array of images", () => {
      const response = {
        images: [minimalValidImage, completeValidImage],
      }
      const result = imageResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it("should validate image detail response with single image", () => {
      const response = {
        image: completeValidImage,
      }
      const result = imageDetailResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it("should reject image response without images array", () => {
      const response = {}
      const result = imageResponseSchema.safeParse(response)
      expect(result.success).toBe(false)
    })

    it("should validate paginated images response", () => {
      const response = {
        images: [minimalValidImage],
        first: "http://example.com/v2/images?limit=10",
        next: "http://example.com/v2/images?limit=10&marker=123",
        schema: "http://example.com/v2/schemas/images",
      }
      const result = imagesPaginatedResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it("should validate paginated response with minimal data", () => {
      const response = {
        images: [],
      }
      const result = imagesPaginatedResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })
  })

  describe("Image Member Schemas", () => {
    const validMember = {
      member_id: "project-456",
      image_id: imageId,
      status: "accepted" as const,
      created_at: "2025-03-01T12:00:00Z",
      updated_at: "2025-03-02T12:00:00Z",
    }

    it("should validate image member", () => {
      const result = imageMemberSchema.safeParse(validMember)
      expect(result.success).toBe(true)
    })

    it("should validate all member status values", () => {
      const statuses = ["pending", "accepted", "rejected"] as const

      for (const status of statuses) {
        const member = { ...validMember, status }
        const result = imageMemberSchema.safeParse(member)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid member status", () => {
      const member = { ...validMember, status: "invalid" }
      const result = imageMemberSchema.safeParse(member)
      expect(result.success).toBe(false)
    })

    it("should require UUID for image_id in member", () => {
      const member = { ...validMember, image_id: "invalid-uuid" }
      const result = imageMemberSchema.safeParse(member)
      expect(result.success).toBe(false)
    })

    it("should validate image members response", () => {
      const response = {
        members: [validMember, { ...validMember, status: "pending" as const }],
      }
      const result = imageMembersResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })
  })

  describe("Input Schemas", () => {
    describe("List Images Input", () => {
      it("should validate minimal list images input", () => {
        const input = { projectId }
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate complete list images input", () => {
        const input = {
          projectId,
          sort_key: "name" as const,
          sort_dir: "asc" as const,
          limit: 50,
          marker: "marker-id",
          name: "Ubuntu",
          status: "active" as const,
          visibility: "public" as const,
          owner: "project-456",
          protected: true,
          container_format: "bare" as const,
          disk_format: "qcow2" as const,
          size_min: 1000000,
          size_max: 5000000000,
          min_ram: 512,
          min_disk: 1,
          tag: "ubuntu",
          os_type: "linux" as const,
          os_hidden: false,
          member_status: "accepted" as const,
          created_at: "gte:2025-01-01T00:00:00Z",
          updated_at: "lte:2025-12-31T23:59:59Z",
        }
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate sort keys", () => {
        const validSortKeys = [
          "name",
          "status",
          "container_format",
          "disk_format",
          "size",
          "id",
          "created_at",
          "updated_at",
          "min_disk",
          "min_ram",
          "owner",
          "protected",
          "visibility",
        ] as const

        for (const sortKey of validSortKeys) {
          const result = sortKeySchema.safeParse(sortKey)
          expect(result.success).toBe(true)
        }
      })

      it("should validate sort directions", () => {
        const validSortDirs = ["asc", "desc"] as const

        for (const sortDir of validSortDirs) {
          const result = sortDirSchema.safeParse(sortDir)
          expect(result.success).toBe(true)
        }
      })

      it("should reject invalid limit values", () => {
        const inputs = [
          { projectId, limit: 0 },
          { projectId, limit: 1001 },
          { projectId, limit: -1 },
        ]

        for (const input of inputs) {
          const result = listImagesInputSchema.safeParse(input)
          expect(result.success).toBe(false)
        }
      })
    })

    describe("Image Member Input Schemas", () => {
      it("should validate list image members input", () => {
        const input = { projectId, imageId }
        const result = listImageMembersInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate get image member input", () => {
        const input = {
          projectId,
          imageId,
          memberId: "member-project-123",
        }
        const result = getImageMemberInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate create image member input", () => {
        const input = {
          projectId,
          imageId,
          member: "new-member-project-456",
        }
        const result = createImageMemberInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate update image member input", () => {
        const input = {
          projectId,
          imageId,
          memberId: "member-project-123",
          status: "accepted" as const,
        }
        const result = updateImageMemberInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate delete image member input", () => {
        const input = {
          projectId,
          imageId,
          memberId: "member-project-123",
        }
        const result = deleteImageMemberInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("Get Image Input", () => {
      it("should validate get image by id input", () => {
        const input = { projectId, imageId }
        const result = getImageByIdInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should require valid UUID for imageId", () => {
        const input = { projectId, imageId: "invalid-uuid" }
        const result = getImageByIdInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Create Image Input", () => {
      it("should validate minimal create image input", () => {
        const input = { projectId }
        const result = createImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.visibility).toBe("private")
          expect(result.data.protected).toBe(false)
          expect(result.data.min_ram).toBe(0)
          expect(result.data.min_disk).toBe(0)
          expect(result.data.tags).toEqual([])
          expect(result.data.os_hidden).toBe(false)
        }
      })

      it("should validate complete create image input", () => {
        const input = {
          projectId,
          name: "My Custom Image",
          id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          container_format: "bare" as const,
          disk_format: "qcow2" as const,
          visibility: "private" as const,
          protected: true,
          min_ram: 1024,
          min_disk: 5,
          tags: ["custom", "test"],
          os_type: "linux" as const,
          os_distro: "ubuntu",
          os_version: "20.04",
          architecture: "x86_64",
          os_hidden: false,
          hw_disk_bus: "virtio",
          hw_scsi_model: "virtio-scsi",
          hw_serial: "ds=nocloud-net",
          hw_qemu_guest_agent: true,
          hw_vif_model: "virtio",
          hw_rng_model: "virtio",
          hw_machine_type: "pc-i440fx-2.11",
          custom_property: "custom_value", // Test catchall
        }
        const result = createImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject negative min_ram and min_disk", () => {
        const inputs = [
          { projectId, min_ram: -1 },
          { projectId, min_disk: -1 },
        ]

        for (const input of inputs) {
          const result = createImageInputSchema.safeParse(input)
          expect(result.success).toBe(false)
        }
      })

      it("should validate visibility enum", () => {
        const validVisibilities = ["public", "private", "shared", "community"] as const

        for (const visibility of validVisibilities) {
          const result = imageVisibilityEnumSchema.safeParse(visibility)
          expect(result.success).toBe(true)
        }
      })
    })

    describe("Upload Image Input", () => {
      it("should validate upload image input with Uint8Array", () => {
        const input = {
          projectId,
          imageId,
          imageData: new Uint8Array([1, 2, 3, 4, 5]),
          contentType: "application/octet-stream",
        }
        const result = uploadImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate upload image input with string data", () => {
        const input = {
          projectId,
          imageId,
          imageData: "base64-encoded-data",
        }
        const result = uploadImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.contentType).toBe("application/octet-stream")
        }
      })
    })

    describe("Update Image Input", () => {
      it("should validate update image input with JSON patch operations", () => {
        const input = {
          projectId,
          imageId,
          operations: [
            { op: "replace" as const, path: "/name", value: "New Name" },
            { op: "add" as const, path: "/tags/-", value: "new-tag" },
            { op: "remove" as const, path: "/old-property" },
          ],
        }
        const result = updateImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate all JSON patch operations", () => {
        const operations = ["add", "remove", "replace", "move", "copy", "test"] as const

        for (const op of operations) {
          const input = {
            projectId,
            imageId,
            operations: [{ op, path: "/test", value: "test" }],
          }
          const result = updateImageInputSchema.safeParse(input)
          expect(result.success).toBe(true)
        }
      })

      it("should require at least one operation", () => {
        const input = {
          projectId,
          imageId,
          operations: [],
        }
        const result = updateImageInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Update Visibility Input", () => {
      it("should validate update visibility input", () => {
        const input = {
          projectId,
          imageId,
          visibility: "public" as const,
        }
        const result = updateImageVisibilityInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("Simple Operation Inputs", () => {
      it("should validate delete image input", () => {
        const input = { projectId, imageId }
        const result = deleteImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate deactivate image input", () => {
        const input = { projectId, imageId }
        const result = deactivateImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate reactivate image input", () => {
        const input = { projectId, imageId }
        const result = reactivateImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("Paginated Input", () => {
      it("should validate paginated input schema", () => {
        const input = {
          projectId,
          limit: 10,
          first: "http://example.com/v2/images?limit=10",
          next: "http://example.com/v2/images?limit=10&marker=123",
        }
        const result = imagesPaginatedInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })
  })

  describe("Member Status Schema", () => {
    it("should validate member status values", () => {
      const statuses = ["pending", "accepted", "rejected"] as const

      for (const status of statuses) {
        const result = memberStatusSchema.safeParse(status)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid member status", () => {
      const result = memberStatusSchema.safeParse("invalid")
      expect(result.success).toBe(false)
    })
  })

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty objects gracefully", () => {
      const result = imageSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it("should handle null values appropriately", () => {
      const result = imageSchema.safeParse(null)
      expect(result.success).toBe(false)
    })

    it("should handle arrays instead of objects", () => {
      const result = imageSchema.safeParse([])
      expect(result.success).toBe(false)
    })

    it("should validate long tag arrays", () => {
      const tags = Array.from({ length: 100 }, (_, i) => `tag-${i}`)
      const input = {
        projectId,
        tags,
      }
      const result = createImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should reject very long individual tags", () => {
      const longTag = "a".repeat(256) // Over 255 character limit
      const input = {
        projectId,
        tags: [longTag],
      }
      const result = createImageInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})
