import { z } from "zod"

// Define simplified CloudProfile schema for the UI
export const cloudProfileSchema = z.object({
  uid: z.string().uuid(),
  name: z.string(),
  provider: z.string(),
  kubernetesVersions: z.array(z.string()),
  machineTypes: z.array(z.string()),
  machineImages: z.array(
    z.object({
      name: z.string(),
      versions: z.array(z.string()),
    })
  ),
  regions: z.array(
    z.object({
      name: z.string(),
      zones: z.array(z.string()),
    })
  ),
})

export type CloudProfile = z.infer<typeof cloudProfileSchema>

/**
 * Converts a raw API response to the simplified CloudProfile format
 */
export function createCloudProfileFromApiResponse(apiResponse: any): CloudProfile {
  return {
    uid: apiResponse.metadata.uid,
    name: apiResponse.metadata.name,
    provider: apiResponse.spec.type,
    kubernetesVersions: apiResponse.spec.kubernetes.versions.map((v: any) => v.version),
    machineTypes: apiResponse.spec.machineTypes.map((mt: any) => mt.name),
    machineImages: apiResponse.spec.machineImages.map((mi: any) => ({
      name: mi.name,
      versions: mi.versions.map((v: any) => v.version),
    })),
    regions: apiResponse.spec.regions?.map((r: any) => ({
      name: r.name,
      zones: r.zones?.map((z: any) => z.name),
    })),
  }
}

/**
 * Converts a list of CloudProfiles from API response
 */
export function createCloudProfilesFromApiResponse(apiResponse: any): CloudProfile[] {
  if (!apiResponse.items) return []
  return apiResponse.items.map((item: any) => createCloudProfileFromApiResponse(item))
}
