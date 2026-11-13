/** Either marker identifies a snapshot; both may be present on the same image. */
export const isSnapshotImage = (image: { image_type?: unknown; block_device_mapping?: unknown }): boolean => {
  if (image.image_type === "snapshot") return true

  let mapping = image.block_device_mapping
  // Glance custom properties may contain Nova's block device mapping as JSON.
  if (typeof mapping === "string") {
    try {
      mapping = JSON.parse(mapping)
    } catch {
      return false
    }
  }

  const devices = Array.isArray(mapping) ? mapping : [mapping]
  return devices.some(
    (device) =>
      typeof device === "object" && device !== null && "source_type" in device && device.source_type === "snapshot"
  )
}
