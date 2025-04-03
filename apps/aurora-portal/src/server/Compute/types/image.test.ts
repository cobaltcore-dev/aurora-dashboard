import { describe, it, expect } from "vitest"
import { imageSchema, imageResponseSchema, imageDetailResponseSchema } from "./image"

describe("Glance Image Schema Validation", () => {
  // Valid minimal image data
  const minimalValidImage = {
    id: "1234-5678-9012-3456",
  }

  // Complete image data with all fields
  const completeValidImage = {
    id: "1234-5678-9012-3456",
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
    file: "/v2/images/1234-5678-9012-3456/file",
    self: "/v2/images/1234-5678-9012-3456",
    tags: ["ubuntu", "lts", "20.04"],
    direct_url: "swift+config://ref1/glance/1234-5678-9012-3456",
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
        href: "https://example.com/v2/images/1234-5678-9012-3456",
        rel: "self",
      },
    ],
    members: ["project-456", "project-789"],
  }

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

  it("should validate valid status values", () => {
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

  it("should still validate with unknown status values", () => {
    const image = { ...minimalValidImage, status: "some_future_status" }
    const result = imageSchema.safeParse(image)
    expect(result.success).toBe(true)
  })

  it("should validate valid disk formats", () => {
    const validFormats = ["ami", "ari", "aki", "vhd", "vhdx", "vmdk", "raw", "qcow2", "vdi", "iso", "ploop"]

    for (const format of validFormats) {
      const image = { ...minimalValidImage, disk_format: format }
      const result = imageSchema.safeParse(image)
      expect(result.success).toBe(true)
    }
  })

  it("should validate null for optional fields", () => {
    const image = {
      ...minimalValidImage,
      name: null,
      checksum: null,
      disk_format: null,
      container_format: null,
    }
    const result = imageSchema.safeParse(image)
    expect(result.success).toBe(true)
  })

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

  it("should validate with unexpected extra properties", () => {
    const image = {
      ...minimalValidImage,
      some_future_property: "value",
      another_property: 123,
    }
    const result = imageSchema.safeParse(image)
    expect(result.success).toBe(true)
  })
})
