import { describe, it, expect } from "vitest"
import {
  convertCloudProfileApiResponseToCloudProfile,
  convertCloudProfileListApiResponseToCloudProfiles,
} from "./cloudProfile"
import { CloudProfileApiResponse } from "./cloudProfileApiSchema"

describe("CloudProfile Conversion Functions", () => {
  // Mock data for testing
  const mockCloudProfile: CloudProfileApiResponse = {
    metadata: {
      name: "openstack",
      uid: "12345678-1234-1234-1234-123456789012",
      resourceVersion: "1234567",
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      type: "openstack",
      kubernetes: {
        versions: [
          {
            version: "1.25.4",
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            classification: "supported",
          },
          {
            version: "1.24.8",
            expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            classification: "supported",
          },
          {
            version: "1.23.15",
            expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            classification: "deprecated",
          },
        ],
      },
      machineImages: [
        {
          name: "ubuntu",
          versions: [
            {
              version: "22.04",
              architectures: ["amd64", "arm64"],
              cri: [{ name: "containerd" }],
            },
            {
              version: "20.04",
              architectures: ["amd64"],
              cri: [{ name: "containerd" }],
            },
          ],
        },
        {
          name: "suse",
          versions: [
            {
              version: "15.4",
              architectures: ["amd64"],
              cri: [{ name: "containerd" }],
            },
          ],
        },
      ],
      machineTypes: [
        {
          name: "m1.large",
          architecture: "amd64",
          cpu: "2",
          memory: "8Gi",
          storage: {
            class: "standard",
            size: "50Gi",
          },
        },
        {
          name: "m1.xlarge",
          architecture: "amd64",
          cpu: "4",
          memory: "16Gi",
          storage: {
            class: "standard",
            size: "80Gi",
          },
        },
        {
          name: "a1.large",
          architecture: "arm64",
          cpu: "2",
          memory: "8Gi",
          storage: {
            class: "standard",
            size: "50Gi",
          },
        },
      ],
      regions: [
        {
          name: "eu-de",
          zones: [
            {
              name: "eu-de-1",
            },
            {
              name: "eu-de-2",
            },
            {
              name: "eu-de-3",
            },
          ],
        },
        {
          name: "us-east",
          zones: [
            {
              name: "us-east-1",
              unavailableMachineTypes: ["a1.large"],
            },
            {
              name: "us-east-2",
            },
          ],
        },
      ],
      volumeTypes: [
        {
          name: "standard",
          class: "standard",
        },
        {
          name: "premium",
          class: "premium",
        },
      ],
    },
  }

  // Mock data without optional fields
  const mockMinimalCloudProfile: CloudProfileApiResponse = {
    metadata: {
      name: "aws",
      uid: "87654321-4321-4321-4321-210987654321",
      resourceVersion: "7654321",
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      type: "aws",
      kubernetes: {
        versions: [
          {
            version: "1.25.4",
          },
        ],
      },
      machineImages: [
        {
          name: "amazon-linux",
          versions: [
            {
              version: "2.0",
            },
          ],
        },
      ],
      machineTypes: [
        {
          name: "t3.large",
          cpu: "2",
          memory: "8Gi",
        },
      ],
    },
  }

  describe("convertCloudProfileApiResponseToCloudProfile", () => {
    it("should convert a complete cloud profile correctly", () => {
      const result = convertCloudProfileApiResponseToCloudProfile(mockCloudProfile)

      // Test basic metadata
      expect(result.uid).toBe(mockCloudProfile.metadata.uid)
      expect(result.name).toBe(mockCloudProfile.metadata.name)
      expect(result.provider).toBe(mockCloudProfile.spec.type)

      // Test Kubernetes versions
      expect(result.kubernetesVersions).toHaveLength(3)
      expect(result.kubernetesVersions).toContain("1.25.4")
      expect(result.kubernetesVersions).toContain("1.24.8")
      expect(result.kubernetesVersions).toContain("1.23.15")

      // Test machine types
      expect(result.machineTypes).toHaveLength(3)

      const m1Large = result.machineTypes.find((mt) => mt.name === "m1.large")
      expect(m1Large).toBeDefined()
      expect(m1Large?.architecture).toBe("amd64")
      expect(m1Large?.cpu).toBe("2")
      expect(m1Large?.memory).toBe("8Gi")

      const a1Large = result.machineTypes.find((mt) => mt.name === "a1.large")
      expect(a1Large).toBeDefined()
      expect(a1Large?.architecture).toBe("arm64")

      // Test machine images
      expect(result.machineImages).toHaveLength(2)

      const ubuntu = result.machineImages.find((mi) => mi.name === "ubuntu")
      expect(ubuntu).toBeDefined()
      expect(ubuntu?.versions).toHaveLength(2)
      expect(ubuntu?.versions).toContain("22.04")
      expect(ubuntu?.versions).toContain("20.04")

      const suse = result.machineImages.find((mi) => mi.name === "suse")
      expect(suse).toBeDefined()
      expect(suse?.versions).toHaveLength(1)
      expect(suse?.versions).toContain("15.4")

      // Test regions
      expect(result.regions).toHaveLength(2)

      const euDe = result.regions?.find((r) => r.name === "eu-de")
      expect(euDe).toBeDefined()
      expect(euDe?.zones).toHaveLength(3)
      expect(euDe?.zones).toContain("eu-de-1")
      expect(euDe?.zones).toContain("eu-de-2")
      expect(euDe?.zones).toContain("eu-de-3")

      const usEast = result.regions?.find((r) => r.name === "us-east")
      expect(usEast).toBeDefined()
      expect(usEast?.zones).toHaveLength(2)
      expect(usEast?.zones).toContain("us-east-1")
      expect(usEast?.zones).toContain("us-east-2")

      // Test volume types
      expect(result.volumeTypes).toHaveLength(2)
      expect(result.volumeTypes).toContain("standard")
      expect(result.volumeTypes).toContain("premium")
    })

    it("should handle a minimal cloud profile correctly", () => {
      const result = convertCloudProfileApiResponseToCloudProfile(mockMinimalCloudProfile)

      // Basic metadata
      expect(result.uid).toBe(mockMinimalCloudProfile.metadata.uid)
      expect(result.name).toBe(mockMinimalCloudProfile.metadata.name)
      expect(result.provider).toBe(mockMinimalCloudProfile.spec.type)

      // Kubernetes versions
      expect(result.kubernetesVersions).toHaveLength(1)
      expect(result.kubernetesVersions[0]).toBe("1.25.4")

      // Machine types - check handling of missing optional fields
      expect(result.machineTypes).toHaveLength(1)
      expect(result.machineTypes[0].name).toBe("t3.large")
      expect(result.machineTypes[0].architecture).toBeUndefined()
      expect(result.machineTypes[0].cpu).toBe("2")
      expect(result.machineTypes[0].memory).toBe("8Gi")

      // Machine images
      expect(result.machineImages).toHaveLength(1)
      expect(result.machineImages[0].name).toBe("amazon-linux")
      expect(result.machineImages[0].versions).toHaveLength(1)
      expect(result.machineImages[0].versions[0]).toBe("2.0")

      // Optional fields
      expect(result.regions).toBeUndefined()
      expect(result.volumeTypes).toBeUndefined()
    })

    it("should handle edge cases correctly", () => {
      // Test with empty arrays
      const emptyArraysProfile: CloudProfileApiResponse = {
        ...mockMinimalCloudProfile,
        spec: {
          ...mockMinimalCloudProfile.spec,
          kubernetes: {
            versions: [],
          },
          machineImages: [],
          machineTypes: [],
          regions: [],
          volumeTypes: [],
        },
      }

      const result = convertCloudProfileApiResponseToCloudProfile(emptyArraysProfile)

      expect(result.kubernetesVersions).toEqual([])
      expect(result.machineImages).toEqual([])
      expect(result.machineTypes).toEqual([])
      expect(result.regions).toEqual([])
      expect(result.volumeTypes).toEqual([])
    })
  })

  describe("convertCloudProfileListApiResponseToCloudProfiles", () => {
    it("should convert a list of cloud profiles correctly", () => {
      const cloudProfileList = [mockCloudProfile, mockMinimalCloudProfile]

      const result = convertCloudProfileListApiResponseToCloudProfiles(cloudProfileList)

      expect(result).toHaveLength(2)

      // Check first profile
      expect(result[0].name).toBe(mockCloudProfile.metadata.name)
      expect(result[0].provider).toBe(mockCloudProfile.spec.type)

      // Check second profile
      expect(result[1].name).toBe(mockMinimalCloudProfile.metadata.name)
      expect(result[1].provider).toBe(mockMinimalCloudProfile.spec.type)
    })

    it("should handle an empty list correctly", () => {
      const result = convertCloudProfileListApiResponseToCloudProfiles([])
      expect(result).toEqual([])
    })

    it("should maintain the order of the original list", () => {
      const profile1 = { ...mockCloudProfile, metadata: { ...mockCloudProfile.metadata, name: "profile1" } }
      const profile2 = { ...mockCloudProfile, metadata: { ...mockCloudProfile.metadata, name: "profile2" } }
      const profile3 = { ...mockCloudProfile, metadata: { ...mockCloudProfile.metadata, name: "profile3" } }

      const cloudProfileList = [profile1, profile2, profile3]

      const result = convertCloudProfileListApiResponseToCloudProfiles(cloudProfileList)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe("profile1")
      expect(result[1].name).toBe("profile2")
      expect(result[2].name).toBe("profile3")
    })
  })

  describe("edge cases and specific field handling", () => {
    it("should handle profiles with regions but no zones", () => {
      const profileWithEmptyZones: CloudProfileApiResponse = {
        ...mockCloudProfile,
        spec: {
          ...mockCloudProfile.spec,
          regions: [
            {
              name: "region-without-zones",
            },
            {
              name: "region-with-empty-zones",
              zones: [],
            },
          ],
        },
      }

      const result = convertCloudProfileApiResponseToCloudProfile(profileWithEmptyZones)

      const regionWithoutZones = result.regions?.find((r) => r.name === "region-without-zones")
      expect(regionWithoutZones).toBeDefined()
      expect(regionWithoutZones?.zones).toBeUndefined()

      const regionWithEmptyZones = result.regions?.find((r) => r.name === "region-with-empty-zones")
      expect(regionWithEmptyZones).toBeDefined()
      expect(regionWithEmptyZones?.zones).toEqual([])
    })

    it("should handle machine types without architecture", () => {
      const profileWithMixedArchitectures: CloudProfileApiResponse = {
        ...mockCloudProfile,
        spec: {
          ...mockCloudProfile.spec,
          machineTypes: [
            {
              name: "with-architecture",
              architecture: "amd64",
              cpu: "2",
              memory: "8Gi",
            },
            {
              name: "without-architecture",
              cpu: "4",
              memory: "16Gi",
            },
          ],
        },
      }

      const result = convertCloudProfileApiResponseToCloudProfile(profileWithMixedArchitectures)

      const withArch = result.machineTypes.find((mt) => mt.name === "with-architecture")
      expect(withArch?.architecture).toBe("amd64")

      const withoutArch = result.machineTypes.find((mt) => mt.name === "without-architecture")
      expect(withoutArch?.architecture).toBeUndefined()
    })

    it("should handle machine images with no versions", () => {
      const profileWithEmptyVersions: CloudProfileApiResponse = {
        ...mockCloudProfile,
        spec: {
          ...mockCloudProfile.spec,
          machineImages: [
            {
              name: "image-with-versions",
              versions: [{ version: "1.0" }, { version: "2.0" }],
            },
            {
              name: "image-without-versions",
              versions: [],
            },
          ],
        },
      }

      const result = convertCloudProfileApiResponseToCloudProfile(profileWithEmptyVersions)

      const withVersions = result.machineImages.find((mi) => mi.name === "image-with-versions")
      expect(withVersions?.versions).toHaveLength(2)

      const withoutVersions = result.machineImages.find((mi) => mi.name === "image-without-versions")
      expect(withoutVersions?.versions).toEqual([])
    })
  })
})
