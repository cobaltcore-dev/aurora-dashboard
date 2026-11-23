import { describe, it, expect } from "vitest"
import { mapCloudProfiles } from "./cloudProfileMapper"

describe("mapCloudProfiles", () => {
  it("filters machine image versions by region using capabilityFlavors", () => {
    const items = [
      {
        metadata: { name: "openstack", uid: "profile-1" },
        spec: {
          type: "openstack",
          kubernetes: {
            versions: [{ version: "1.30.2" }, { version: "1.31.0" }],
          },
          machineTypes: [{ name: "m1.large", cpu: "4", memory: "8Gi" }],
          machineImages: [
            {
              name: "ubuntu",
              versions: [{ version: "20.04" }, { version: "22.04" }],
            },
          ],
          providerConfig: {
            apiVersion: "openstack.provider.extensions.gardener.cloud/v1alpha1",
            machineImages: [
              {
                name: "ubuntu",
                versions: [
                  {
                    version: "20.04",
                    capabilityFlavors: [{ regions: ["qa-de-1", "qa-de-2"] }],
                  },
                  {
                    version: "22.04",
                    capabilityFlavors: [{ regions: ["prod-de-1"] }],
                  },
                ],
              },
            ],
          },
          regions: [{ name: "qa-de-1", zones: [{ name: "qa-de-1a" }] }],
        },
      },
    ]

    const profiles = mapCloudProfiles(items, "qa-de-1")
    expect(profiles).toHaveLength(1)
    expect(profiles[0].machineImages).toEqual([
      {
        name: "ubuntu",
        versions: ["20.04"], // 22.04 filtered out
      },
    ])
  })

  it("filters machine image versions by region using regions fallback", () => {
    const items = [
      {
        metadata: { name: "openstack" },
        spec: {
          machineImages: [
            {
              name: "ubuntu",
              versions: [{ version: "20.04" }, { version: "22.04" }],
            },
          ],
          providerConfig: {
            machineImages: [
              {
                name: "ubuntu",
                versions: [
                  {
                    version: "20.04",
                    regions: [{ name: "qa-de-1" }],
                  },
                  {
                    version: "22.04",
                    regions: [{ name: "prod-de-1" }],
                  },
                ],
              },
            ],
          },
        },
      },
    ]

    const profiles = mapCloudProfiles(items, "qa-de-1")
    expect(profiles[0].machineImages[0].versions).toEqual(["20.04"])
  })

  it("keeps all versions when no region filter is found", () => {
    const items = [
      {
        metadata: { name: "openstack" },
        spec: {
          machineImages: [
            {
              name: "ubuntu",
              versions: [{ version: "20.04" }, { version: "22.04" }],
            },
          ],
          providerConfig: {},
        },
      },
    ]

    const profiles = mapCloudProfiles(items, "qa-de-1")
    expect(profiles[0].machineImages[0].versions).toEqual(["20.04", "22.04"])
  })

  it("maps all profile fields", () => {
    const items = [
      {
        metadata: { name: "openstack", uid: "abc-123" },
        spec: {
          type: "openstack",
          kubernetes: {
            versions: [{ version: "1.30.2" }],
          },
          machineTypes: [{ name: "m1.large", architecture: "amd64", cpu: "4", memory: "8Gi" }],
          machineImages: [{ name: "ubuntu", versions: [{ version: "20.04" }] }],
          regions: [{ name: "qa-de-1", zones: [{ name: "qa-de-1a", unavailableMachineTypes: ["m1.xlarge"] }] }],
          providerConfig: { apiVersion: "v1alpha1" },
        },
      },
    ]

    const profiles = mapCloudProfiles(items, "qa-de-1")
    expect(profiles[0]).toMatchObject({
      uid: "abc-123",
      name: "openstack",
      provider: "openstack",
      providerConfig: { apiVersion: "v1alpha1" },
      kubernetesVersions: ["1.30.2"],
      machineTypes: [{ name: "m1.large", architecture: "amd64", cpu: "4", memory: "8Gi" }],
      regions: [{ name: "qa-de-1", zones: [{ name: "qa-de-1a", unavailableMachineTypes: ["m1.xlarge"] }] }],
    })
  })
})
