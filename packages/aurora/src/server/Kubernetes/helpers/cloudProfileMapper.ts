/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CloudProfile } from "../types/cloudProfile"

/**
 * Maps and filters cloud profiles for a region.
 * Ported from elektra/plugins/kubernetes_ng/app/services/service_layer/kubernetes_ng_services.rb#list_cloud_profiles
 * and app/helpers/kubernetes/cloud_profiles_helper.rb
 */
export function mapCloudProfiles(items: any[], region: string): CloudProfile[] {
  return items.map((item) => {
    const spec = item.spec || {}
    const providerConfig = spec.providerConfig || {}

    // Build machine image version → regions map
    const imageVersionRegions = new Map<string, Map<string, Set<string>>>()
    const providerMachineImages = providerConfig.machineImages || []

    for (const img of providerMachineImages) {
      const imageName = img.name
      if (!imageName) continue

      const versions = img.versions || []
      for (const ver of versions) {
        const versionName = ver.version
        if (!versionName) continue

        // Try capabilityFlavors first (newer format), fall back to regions
        const regionsList = ver.capabilityFlavors || ver.regions || []
        const regionNames = regionsList
          .map((r: any) => r.regions || r.name)
          .flat()
          .filter(Boolean)

        if (!imageVersionRegions.has(imageName)) {
          imageVersionRegions.set(imageName, new Map())
        }
        const versionMap = imageVersionRegions.get(imageName)!
        if (!versionMap.has(versionName)) {
          versionMap.set(versionName, new Set())
        }
        for (const rn of regionNames) {
          versionMap.get(versionName)!.add(rn)
        }
      }
    }

    // Filter machine images to versions available in this region
    const machineImages: CloudProfile["machineImages"] = []
    for (const img of spec.machineImages || []) {
      const imageName = img.name
      if (!imageName) continue

      const allVersions = (img.versions || []).map((v: any) => v.version).filter(Boolean)
      const versionMap = imageVersionRegions.get(imageName)

      let filteredVersions: string[]
      if (versionMap) {
        // Filter to versions that include this region
        filteredVersions = allVersions.filter((v: string) => {
          const regions = versionMap.get(v)
          return regions && regions.has(region)
        })
      } else {
        // No region filter found; keep all versions
        filteredVersions = allVersions
      }

      machineImages.push({
        name: imageName,
        versions: filteredVersions,
      })
    }

    const profile: CloudProfile = {
      uid: item.metadata?.uid,
      name: item.metadata?.name || "",
      provider: spec.type,
      providerConfig: {
        apiVersion: providerConfig.apiVersion,
      },
      kubernetesVersions: (spec.kubernetes?.versions || []).map((v: any) => v.version).filter(Boolean),
      machineTypes: (spec.machineTypes || []).map((mt: any) => ({
        name: mt.name,
        architecture: mt.architecture,
        cpu: mt.cpu,
        memory: mt.memory,
      })),
      machineImages,
      regions: (spec.regions || []).map((r: any) => ({
        name: r.name,
        zones: (r.zones || []).map((z: any) => ({
          name: z.name,
          unavailableMachineTypes: z.unavailableMachineTypes,
        })),
      })),
    }

    return profile
  })
}
