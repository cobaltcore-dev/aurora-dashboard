import { GlanceImage } from "@/server/Compute/types/image"

/**
 * Converts partial image properties to OpenStack JSON Patch operations
 * Determines whether to use 'add', 'replace', or 'remove' based on original image state
 */
export function convertToJsonPatchOperations(
  updatedProperties: Partial<GlanceImage>,
  originalImage: GlanceImage
): Array<{ op: "add" | "replace" | "remove"; path: string; value?: unknown }> {
  const operations: Array<{ op: "add" | "replace" | "remove"; path: string; value?: unknown }> = []

  Object.entries(updatedProperties).forEach(([key, value]) => {
    const path = `/${key}`

    if (value === null || value === undefined) {
      // Remove operation for null/undefined values (only if property exists)
      if (key in originalImage) {
        operations.push({ op: "remove", path })
      }
    } else {
      // Check if property exists in original image
      const propertyExists = key in originalImage

      if (propertyExists) {
        // Use 'replace' for existing properties
        operations.push({ op: "replace", path, value })
      } else {
        // Use 'add' for new properties
        operations.push({ op: "add", path, value })
      }
    }
  })

  return operations
}
