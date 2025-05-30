import { z } from "zod"
import { CloudProfileApiResponse } from "./cloudProfileApiSchema"

// Simplified CloudProfile schema for UI
export const cloudProfileSchema = z.object({
  uid: z.string().uuid(),
  name: z.string(),
  provider: z.string(),
  kubernetesVersions: z.array(z.string()),
  machineTypes: z.array(
    z.object({
      name: z.string(),
      architecture: z.string().optional(),
      cpu: z.string(),
      memory: z.string(),
    })
  ),
  machineImages: z.array(
    z.object({
      name: z.string(),
      versions: z.array(z.string()),
    })
  ),
  regions: z
    .array(
      z.object({
        name: z.string(),
        zones: z.array(z.string()).optional(),
      })
    )
    .optional(),
  volumeTypes: z.array(z.string()).optional(),
})

export type CloudProfile = z.infer<typeof cloudProfileSchema>

/**
 * Converts a Gardener CloudProfile item to a simplified UI format
 */
export function convertCloudProfileApiResponseToCloudProfile(cloudProfile: CloudProfileApiResponse): CloudProfile {
  return {
    uid: cloudProfile.metadata.uid,
    name: cloudProfile.metadata.name,
    provider: cloudProfile.spec.type,
    kubernetesVersions: cloudProfile.spec.kubernetes.versions.map((version) => version.version),
    machineTypes: cloudProfile.spec.machineTypes.map((machineType) => ({
      name: machineType.name,
      architecture: machineType.architecture,
      cpu: machineType.cpu,
      memory: machineType.memory,
    })),
    machineImages: cloudProfile.spec.machineImages.map((machineImage) => ({
      name: machineImage.name,
      versions: machineImage.versions.map((version) => version.version),
    })),
    regions: cloudProfile.spec.regions?.map((region) => ({
      name: region.name,
      zones: region.zones?.map((zone) => zone.name),
    })),
    volumeTypes: cloudProfile.spec.volumeTypes?.map((volumeType) => volumeType.name),
  }
}

export function convertCloudProfileListApiResponseToCloudProfiles(
  cloudProfiles: CloudProfileApiResponse[]
): CloudProfile[] {
  return cloudProfiles.map((cloudProfile) => convertCloudProfileApiResponseToCloudProfile(cloudProfile))
}
