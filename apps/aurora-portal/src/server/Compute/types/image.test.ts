import { describe, it, expect } from "vitest"
import {
  imageSchema,
  imageResponseSchema,
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
  deleteImagesInputSchema,
  activateImagesInputSchema,
  deactivateImagesInputSchema,
  bulkOperationResultSchema,
} from "./image"

describe("Glance Image Schema Validation", () => {
  // Using a simple, known-good UUID
  const imageId = "123e4567-e89b-12d3-a456-426614174000"

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
        const input = {}
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate complete list images input", () => {
        const input = {
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
        const inputs = [{ limit: 0 }, { limit: 1001 }, { limit: -1 }]

        for (const input of inputs) {
          const result = listImagesInputSchema.safeParse(input)
          expect(result.success).toBe(false)
        }
      })
    })

    describe("Image Member Input Schemas", () => {
      it("should validate list image members input", () => {
        const input = { imageId }
        const result = listImageMembersInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate get image member input", () => {
        const input = {
          imageId,
          memberId: "member-project-123",
        }
        const result = getImageMemberInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate create image member input", () => {
        const input = {
          imageId,
          member: "new-member-project-456",
        }
        const result = createImageMemberInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate update image member input", () => {
        const input = {
          imageId,
          memberId: "member-project-123",
          status: "accepted" as const,
        }
        const result = updateImageMemberInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate delete image member input", () => {
        const input = {
          imageId,
          memberId: "member-project-123",
        }
        const result = deleteImageMemberInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("Get Image Input", () => {
      it("should validate get image by id input", () => {
        const input = { imageId }
        const result = getImageByIdInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should require valid UUID for imageId", () => {
        const input = { imageId: "invalid-uuid" }
        const result = getImageByIdInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Create Image Input", () => {
      it("should validate minimal create image input", () => {
        const input = {}
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
        const inputs = [{ min_ram: -1 }, { min_disk: -1 }]

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
          imageId,
          imageData: new Uint8Array([1, 2, 3, 4, 5]),
          contentType: "application/octet-stream",
        }
        const result = uploadImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate upload image input with string data", () => {
        const input = {
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
            imageId,
            operations: [{ op, path: "/test", value: "test" }],
          }
          const result = updateImageInputSchema.safeParse(input)
          expect(result.success).toBe(true)
        }
      })

      it("should require at least one operation", () => {
        const input = {
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
          imageId,
          visibility: "public" as const,
        }
        const result = updateImageVisibilityInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("Simple Operation Inputs", () => {
      it("should validate delete image input", () => {
        const input = { imageId }
        const result = deleteImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate deactivate image input", () => {
        const input = { imageId }
        const result = deactivateImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate reactivate image input", () => {
        const input = { imageId }
        const result = reactivateImageInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("Paginated Input", () => {
      it("should validate paginated input schema", () => {
        const input = {
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
        tags,
      }
      const result = createImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should reject very long individual tags", () => {
      const longTag = "a".repeat(256) // Over 255 character limit
      const input = {
        tags: [longTag],
      }
      const result = createImageInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe("Bulk Operations", () => {
    const validUUIDs = [
      "123e4567-e89b-12d3-a456-426614174000",
      "223e4567-e89b-12d3-a456-426614174001",
      "323e4567-e89b-12d3-a456-426614174002",
    ]

    describe("Delete Images", () => {
      it("should validate delete images input with multiple IDs", () => {
        const input = { imageIds: validUUIDs }
        const result = deleteImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate delete images input with single ID", () => {
        const input = { imageIds: [validUUIDs[0]] }
        const result = deleteImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject empty imageIds array", () => {
        const input = { imageIds: [] }
        const result = deleteImagesInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it("should reject invalid UUID in imageIds", () => {
        const input = { imageIds: ["invalid-uuid"] }
        const result = deleteImagesInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it("should reject when imageIds is missing", () => {
        const input = {}
        const result = deleteImagesInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Activate Images", () => {
      it("should validate activate images input", () => {
        const input = { imageIds: validUUIDs }
        const result = activateImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject empty array", () => {
        const input = { imageIds: [] }
        const result = activateImagesInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it("should reject mixed valid and invalid UUIDs", () => {
        const input = { imageIds: [validUUIDs[0], "not-a-uuid"] }
        const result = activateImagesInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Deactivate Images", () => {
      it("should validate deactivate images input", () => {
        const input = { imageIds: validUUIDs }
        const result = deactivateImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject empty array", () => {
        const input = { imageIds: [] }
        const result = deactivateImagesInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Bulk Operation Result", () => {
      it("should validate successful bulk operation result", () => {
        const result = {
          successful: validUUIDs,
          failed: [],
        }
        const parsed = bulkOperationResultSchema.safeParse(result)
        expect(parsed.success).toBe(true)
      })

      it("should validate partial success bulk operation result", () => {
        const result = {
          successful: [validUUIDs[0]],
          failed: [
            { imageId: validUUIDs[1], error: "Image not found" },
            { imageId: validUUIDs[2], error: "Permission denied" },
          ],
        }
        const parsed = bulkOperationResultSchema.safeParse(result)
        expect(parsed.success).toBe(true)
      })

      it("should validate all failed bulk operation result", () => {
        const result = {
          successful: [],
          failed: validUUIDs.map((id) => ({
            imageId: id,
            error: "Operation failed",
          })),
        }
        const parsed = bulkOperationResultSchema.safeParse(result)
        expect(parsed.success).toBe(true)
      })

      it("should reject missing successful field", () => {
        const result = {
          failed: [],
        }
        const parsed = bulkOperationResultSchema.safeParse(result)
        expect(parsed.success).toBe(false)
      })

      it("should reject missing failed field", () => {
        const result = {
          successful: [],
        }
        const parsed = bulkOperationResultSchema.safeParse(result)
        expect(parsed.success).toBe(false)
      })

      it("should reject failed items without error field", () => {
        const result = {
          successful: [],
          failed: [{ imageId: validUUIDs[0] }],
        }
        const parsed = bulkOperationResultSchema.safeParse(result)
        expect(parsed.success).toBe(false)
      })
    })
  })

  describe("Sort Schemas", () => {
    describe("Sort Key", () => {
      it("should validate all sort key values", () => {
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
        ]

        for (const key of validSortKeys) {
          const result = sortKeySchema.safeParse(key)
          expect(result.success).toBe(true)
        }
      })

      it("should reject invalid sort key", () => {
        const result = sortKeySchema.safeParse("invalid_key")
        expect(result.success).toBe(false)
      })
    })

    describe("Sort Direction", () => {
      it("should validate asc sort direction", () => {
        const result = sortDirSchema.safeParse("asc")
        expect(result.success).toBe(true)
      })

      it("should validate desc sort direction", () => {
        const result = sortDirSchema.safeParse("desc")
        expect(result.success).toBe(true)
      })

      it("should reject invalid sort direction", () => {
        const result = sortDirSchema.safeParse("ascending")
        expect(result.success).toBe(false)
      })
    })
  })

  describe("Multi-Value Filters", () => {
    describe("Status Filter", () => {
      it("should validate single status value", () => {
        const input = { status: "active" }
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate multi-value status with 'in:' operator", () => {
        const input = { status: "in:active,queued,saving" }
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate all valid status values", () => {
        const statuses = [
          "queued",
          "saving",
          "active",
          "killed",
          "deleted",
          "pending_delete",
          "deactivated",
          "uploading",
          "importing",
        ]

        for (const status of statuses) {
          const result = listImagesInputSchema.safeParse({ status })
          expect(result.success).toBe(true)
        }
      })
    })

    describe("Container Format Filter", () => {
      it("should validate single container format", () => {
        const input = { container_format: "bare" }
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate multi-value container format", () => {
        const input = { container_format: "in:bare,ovf,ova" }
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate all container format values", () => {
        const formats = ["bare", "ovf", "ova", "docker", "ami", "ari", "aki", "compressed"]

        for (const format of formats) {
          const result = listImagesInputSchema.safeParse({ container_format: format })
          expect(result.success).toBe(true)
        }
      })
    })

    describe("Disk Format Filter", () => {
      it("should validate single disk format", () => {
        const input = { disk_format: "qcow2" }
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate multi-value disk format", () => {
        const input = { disk_format: "in:qcow2,raw,vmdk" }
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate all disk format values", () => {
        const formats = ["ami", "ari", "aki", "vhd", "vhdx", "vmdk", "raw", "qcow2", "vdi", "iso", "ploop"]

        for (const format of formats) {
          const result = listImagesInputSchema.safeParse({ disk_format: format })
          expect(result.success).toBe(true)
        }
      })
    })
  })

  describe("Advanced List Images Filtering", () => {
    it("should validate visibility filter with 'all'", () => {
      const input = { visibility: "all" }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate all visibility filter values", () => {
      const visibilities = ["public", "private", "shared", "community", "all"]

      for (const visibility of visibilities) {
        const result = listImagesInputSchema.safeParse({ visibility })
        expect(result.success).toBe(true)
      }
    })

    it("should validate size range filters", () => {
      const input = {
        size_min: 1073741824, // 1GB
        size_max: 10737418240, // 10GB
      }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate min_ram and min_disk filters", () => {
      const input = {
        min_ram: 2048,
        min_disk: 20,
      }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate tag filter", () => {
      const input = { tag: "ubuntu" }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate os_type filter", () => {
      const osTypes = ["linux", "windows"]

      for (const osType of osTypes) {
        const result = listImagesInputSchema.safeParse({ os_type: osType })
        expect(result.success).toBe(true)
      }
    })

    it("should validate os_hidden filter", () => {
      const inputs = [{ os_hidden: true }, { os_hidden: false }]

      for (const input of inputs) {
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it("should validate member_status filter", () => {
      const statuses = ["pending", "accepted", "rejected", "all"]

      for (const status of statuses) {
        const result = listImagesInputSchema.safeParse({ member_status: status })
        expect(result.success).toBe(true)
      }
    })

    it("should validate created_at filter with operator", () => {
      const input = { created_at: "gte:2025-01-01T00:00:00Z" }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate updated_at filter with operator", () => {
      const input = { updated_at: "lte:2025-12-31T23:59:59Z" }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate owner filter", () => {
      const input = { owner: "project-123" }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate protected filter", () => {
      const inputs = [{ protected: true }, { protected: false }]

      for (const input of inputs) {
        const result = listImagesInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it("should validate combined filters", () => {
      const input = {
        name: "Ubuntu",
        status: "in:active,queued",
        visibility: "public",
        disk_format: "qcow2",
        size_min: 1073741824,
        size_max: 5368709120,
        os_type: "linux",
        tag: "lts",
        sort_key: "created_at",
        sort_dir: "desc",
        limit: 50,
      }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate alternative sort syntax", () => {
      const input = { sort: "name:asc,created_at:desc" }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should reject limit below 1", () => {
      const input = { limit: 0 }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should reject limit above 1000", () => {
      const input = { limit: 1001 }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should validate marker for pagination", () => {
      const input = {
        limit: 100,
        marker: "123e4567-e89b-12d3-a456-426614174000",
      }
      const result = listImagesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe("JSON Patch Operations Edge Cases", () => {
    const imageId = "123e4567-e89b-12d3-a456-426614174000"

    it("should validate move operation with from field", () => {
      const input = {
        imageId,
        operations: [{ op: "move" as const, path: "/new-path", from: "/old-path" }],
      }
      const result = updateImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate copy operation with from field", () => {
      const input = {
        imageId,
        operations: [{ op: "copy" as const, path: "/new-path", from: "/source-path" }],
      }
      const result = updateImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate test operation", () => {
      const input = {
        imageId,
        operations: [{ op: "test" as const, path: "/name", value: "Expected Name" }],
      }
      const result = updateImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate remove operation without value", () => {
      const input = {
        imageId,
        operations: [{ op: "remove" as const, path: "/old-property" }],
      }
      const result = updateImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate multiple operations in single request", () => {
      const input = {
        imageId,
        operations: [
          { op: "replace" as const, path: "/name", value: "New Name" },
          { op: "add" as const, path: "/tags/-", value: "new-tag" },
          { op: "remove" as const, path: "/old-property" },
          { op: "replace" as const, path: "/visibility", value: "public" },
        ],
      }
      const result = updateImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate operations on nested paths", () => {
      const input = {
        imageId,
        operations: [{ op: "replace" as const, path: "/metadata/key", value: "new-value" }],
      }
      const result = updateImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate array index operations", () => {
      const input = {
        imageId,
        operations: [
          { op: "add" as const, path: "/tags/0", value: "first-tag" },
          { op: "remove" as const, path: "/tags/1" },
        ],
      }
      const result = updateImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe("Upload Image Data Types", () => {
    const imageId = "123e4567-e89b-12d3-a456-426614174000"

    it("should validate upload with ArrayBuffer", () => {
      const buffer = new ArrayBuffer(1024)
      const input = {
        imageId,
        imageData: buffer,
      }
      const result = uploadImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should validate upload with custom content type", () => {
      const input = {
        imageId,
        imageData: new Uint8Array([1, 2, 3]),
        contentType: "application/x-raw-disk",
      }
      const result = uploadImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should reject upload without imageData", () => {
      const input = { imageId }
      const result = uploadImageInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should reject upload without imageId", () => {
      const input = { imageData: new Uint8Array([1, 2, 3]) }
      const result = uploadImageInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe("Create Image Custom Properties", () => {
    it("should allow custom string properties via catchall", () => {
      const input = {
        name: "Custom Image",
        custom_key1: "value1",
        custom_key2: "value2",
        another_property: "another_value",
      }
      const result = createImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should reject non-string custom properties", () => {
      const input = {
        name: "Custom Image",
        custom_number: 123, // Should be string per catchall
      }
      const result = createImageInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should validate with all hardware properties", () => {
      const input = {
        hw_disk_bus: "virtio",
        hw_scsi_model: "virtio-scsi",
        hw_serial: "ds=nocloud-net",
        hw_qemu_guest_agent: true,
        hw_vif_model: "virtio",
        hw_rng_model: "virtio",
        hw_machine_type: "pc-i440fx-2.11",
      }
      const result = createImageInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe("Image Member Operations Edge Cases", () => {
    const imageId = "123e4567-e89b-12d3-a456-426614174000"

    it("should reject get member input with invalid UUID", () => {
      const input = {
        imageId: "not-a-uuid",
        memberId: "member-123",
      }
      const result = getImageMemberInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should validate update member with all status values", () => {
      const statuses = ["pending", "accepted", "rejected"] as const

      for (const status of statuses) {
        const input = { imageId, memberId: "member-123", status }
        const result = updateImageMemberInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it("should reject update member with invalid status", () => {
      const input = {
        imageId,
        memberId: "member-123",
        status: "invalid",
      }
      const result = updateImageMemberInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should validate create member with project ID", () => {
      const input = {
        imageId,
        member: "project-456",
      }
      const result = createImageMemberInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should reject create member without member field", () => {
      const input = { imageId }
      const result = createImageMemberInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe("Response Schema Edge Cases", () => {
    it("should validate empty images array", () => {
      const response = { images: [] }
      const result = imageResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it("should validate paginated response without next link", () => {
      const response = {
        images: [{ id: "123e4567-e89b-12d3-a456-426614174000" }],
        first: "http://example.com/v2/images",
      }
      const result = imagesPaginatedResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it("should validate image members response with empty members", () => {
      const response = { members: [] }
      const result = imageMembersResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it("should validate image member schema", () => {
      const member = {
        member_id: "project-123",
        image_id: "123e4567-e89b-12d3-a456-426614174000",
        status: "accepted",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
        schema: "/v2/schemas/member",
      }
      const result = imageMemberSchema.safeParse(member)
      expect(result.success).toBe(true)
    })

    it("should reject image member without required fields", () => {
      const member = {
        member_id: "project-123",
        // missing image_id, status, created_at, updated_at
      }
      const result = imageMemberSchema.safeParse(member)
      expect(result.success).toBe(false)
    })
  })
})
