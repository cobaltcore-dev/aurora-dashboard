import { describe, expect, it } from "vitest"
import { isSnapshotImage } from "./image"

describe("isSnapshotImage", () => {
  it.each([
    { image_type: "snapshot" },
    { block_device_mapping: { source_type: "snapshot" } },
    { block_device_mapping: [{ source_type: "volume" }, { source_type: "snapshot" }] },
    { block_device_mapping: JSON.stringify([{ source_type: "snapshot", snapshot_id: "snapshot-id" }]) },
    { block_device_mapping: JSON.stringify({ source_type: "snapshot" }) },
    { image_type: "backup", block_device_mapping: [{ source_type: "snapshot" }] },
    { image_type: "snapshot", block_device_mapping: "invalid JSON" },
    { image_type: "snapshot", block_device_mapping: [{ source_type: "snapshot" }] },
    { image_type: "snapshot", block_device_mapping: JSON.stringify([{ source_type: "snapshot" }]) },
    { image_type: "snapshot", block_device_mapping: [{ source_type: "image" }] },
    { image_type: null, block_device_mapping: [{ source_type: "snapshot" }] },
  ])("recognizes either snapshot marker: %j", (image) => {
    expect(isSnapshotImage(image)).toBe(true)
  })

  it.each([
    {},
    { image_type: null },
    { image_type: "backup" },
    { image_type: "SNAPSHOT" },
    { block_device_mapping: null },
    { block_device_mapping: [] },
    { block_device_mapping: [{ source_type: "image" }, { source_type: "volume" }] },
    { block_device_mapping: [{ source_type: "SNAPSHOT" }] },
    { block_device_mapping: "invalid JSON" },
    { block_device_mapping: '[{"source_type":"snapshot"}' },
    { block_device_mapping: "null" },
    { block_device_mapping: '[null, 1, "snapshot", {}]' },
  ])("does not classify missing, unrelated, or malformed markers as snapshots: %j", (image) => {
    expect(isSnapshotImage(image)).toBe(false)
  })
})
