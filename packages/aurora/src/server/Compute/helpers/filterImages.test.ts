import { describe, expect, it } from "vitest"
import { filterImages } from "./filterImages"
import type { GlanceImage } from "../types/image"

const images: GlanceImage[] = [
  { id: "snapshot", name: "ubuntu snapshot", image_type: "snapshot", status: "active", disk_format: "qcow2" },
  { id: "regular", name: "ubuntu image", status: "active", disk_format: "qcow2" },
  { id: "backup", image_type: "backup", status: "active", disk_format: "raw" },
  { id: "null", image_type: null },
  { id: "empty", image_type: "" },
  { id: "custom", image_type: "custom" },
  { id: "uppercase", image_type: "SNAPSHOT" },
  { id: "volume-snapshot", block_device_mapping: JSON.stringify([{ source_type: "snapshot" }]) },
  { id: "both-markers", image_type: "snapshot", block_device_mapping: [{ source_type: "snapshot" }] },
]

describe("filterImages — type", () => {
  it("returns only exact snapshot markers", () => {
    expect(filterImages(images, { image_type: "snapshot" })).toEqual([images[0], images[7], images[8]])
  })

  it("includes missing, null, backup, and custom metadata as regular images", () => {
    expect(filterImages(images, { image_type: "images" })).toEqual(images.slice(1, 7))
  })

  it.each([undefined, "all"] as const)("does not restrict types for %s", (image_type) => {
    expect(filterImages(images, { image_type })).toEqual(images)
  })

  it("combines type with existing filters", () => {
    expect(
      filterImages(images, { image_type: "snapshot", name: "ubuntu", status: "active", disk_format: "qcow2" })
    ).toEqual([images[0]])
    expect(filterImages(images, { image_type: "snapshot", disk_format: "raw" })).toEqual([])
  })
})
