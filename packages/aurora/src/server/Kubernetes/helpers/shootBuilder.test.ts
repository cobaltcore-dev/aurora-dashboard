import { describe, it, expect } from "vitest"
import { buildShootForCreate, toGardenerTime, mergeWorkers, buildUpdatePatch } from "./shootBuilder"
import type { Shoot } from "../types/shoot"

describe("shootBuilder", () => {
  describe("buildShootForCreate", () => {
    it("builds a shoot with all required fields", () => {
      const input = {
        project_id: "p-1",
        landscape: "qa" as const,
        name: "test-cluster",
        cloudProfileName: "openstack",
        kubernetesVersion: "1.30.2",
        infrastructure: {
          floatingPoolName: "ext-net",
          apiVersion: "openstack.provider.extensions.gardener.cloud/v1alpha1",
        },
        workers: [
          {
            name: "worker-1",
            machineType: "m1.large",
            machineImage: { name: "ubuntu", version: "20.04" },
            minimum: 1,
            maximum: 3,
            zones: ["zone-a"],
          },
        ],
      }

      const shoot = buildShootForCreate(input, "qa-de-1")

      expect(shoot).toMatchObject({
        apiVersion: "core.gardener.cloud/v1beta1",
        kind: "Shoot",
        metadata: {
          name: "test-cluster",
        },
        spec: {
          region: "qa-de-1",
          cloudProfile: {
            name: "openstack",
          },
          kubernetes: {
            version: "1.30.2",
          },
          provider: {
            type: "openstack",
            infrastructureConfig: {
              apiVersion: "openstack.provider.extensions.gardener.cloud/v1alpha1",
              kind: "InfrastructureConfig",
              floatingPoolName: "ext-net",
            },
            workers: [
              {
                name: "worker-1",
                minimum: 1,
                maximum: 3,
                zones: ["zone-a"],
                machine: {
                  type: "m1.large",
                  image: {
                    name: "ubuntu",
                    version: "20.04",
                  },
                },
              },
            ],
          },
        },
      })
    })

    it("includes optional networking fields", () => {
      const input = {
        project_id: "p-1",
        landscape: "qa" as const,
        name: "test-cluster",
        cloudProfileName: "openstack",
        kubernetesVersion: "1.30.2",
        infrastructure: {
          floatingPoolName: "ext-net",
          apiVersion: "openstack.provider.extensions.gardener.cloud/v1alpha1",
          networkWorkers: "10.250.0.0/16",
        },
        networking: {
          pods: "100.96.0.0/11",
          services: "100.64.0.0/13",
        },
        workers: [
          {
            name: "worker-1",
            machineType: "m1.large",
            machineImage: { name: "ubuntu", version: "20.04" },
            minimum: 1,
            maximum: 3,
            zones: ["zone-a"],
          },
        ],
      }

      const shoot = buildShootForCreate(input, "qa-de-1")

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing internal structure
      expect((shoot.spec as any).networking).toEqual({
        pods: "100.96.0.0/11",
        services: "100.64.0.0/13",
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing internal structure
      expect((shoot.spec as any).provider.infrastructureConfig.networks).toEqual({
        workers: "10.250.0.0/16",
      })
    })
  })

  describe("toGardenerTime", () => {
    it("converts display time to Gardener format", () => {
      expect(toGardenerTime("22:00", "+01:00")).toBe("220000+0100")
      expect(toGardenerTime("08:30", "-05:00")).toBe("083000-0500")
    })
  })

  describe("mergeWorkers", () => {
    it("keeps unedited fields of existing workers", () => {
      const existing = [
        {
          name: "worker-1",
          minimum: 1,
          maximum: 3,
          zones: ["zone-a"],
          machine: { type: "m1.large", image: { name: "ubuntu", version: "20.04" } },
          labels: { foo: "bar" },
          taints: [{ key: "test", effect: "NoSchedule" }],
          volume: { size: "50Gi" },
        },
      ]

      const edited = [
        {
          name: "worker-1",
          machineType: "m1.xlarge",
          machineImage: { name: "ubuntu", version: "22.04" },
          minimum: 2,
          maximum: 5,
          zones: ["zone-a", "zone-b"],
        },
      ]

      const result = mergeWorkers(existing, edited)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: "worker-1",
        minimum: 2,
        maximum: 5,
        zones: ["zone-a", "zone-b"],
        machine: {
          type: "m1.xlarge",
          image: { name: "ubuntu", version: "22.04" },
        },
        labels: { foo: "bar" },
        taints: [{ key: "test", effect: "NoSchedule" }],
        volume: { size: "50Gi" },
      })
    })

    it("adds new workers", () => {
      const existing = [
        {
          name: "worker-1",
          minimum: 1,
          maximum: 3,
          zones: ["zone-a"],
          machine: { type: "m1.large", image: { name: "ubuntu", version: "20.04" } },
        },
      ]

      const edited = [
        {
          name: "worker-1",
          machineType: "m1.large",
          machineImage: { name: "ubuntu", version: "20.04" },
          minimum: 1,
          maximum: 3,
          zones: ["zone-a"],
        },
        {
          name: "worker-2",
          machineType: "m1.small",
          machineImage: { name: "flatcar", version: "3815.2.0" },
          minimum: 0,
          maximum: 2,
          zones: ["zone-b"],
        },
      ]

      const result = mergeWorkers(existing, edited)

      expect(result).toHaveLength(2)
      expect(result[1]).toMatchObject({
        name: "worker-2",
        minimum: 0,
        maximum: 2,
        machine: {
          type: "m1.small",
          image: { name: "flatcar", version: "3815.2.0" },
        },
      })
    })

    it("removes workers not in edited", () => {
      const existing = [
        {
          name: "worker-1",
          minimum: 1,
          maximum: 3,
          zones: ["zone-a"],
          machine: { type: "m1.large", image: { name: "ubuntu", version: "20.04" } },
        },
        {
          name: "worker-2",
          minimum: 0,
          maximum: 2,
          zones: ["zone-b"],
          machine: { type: "m1.small", image: { name: "flatcar", version: "3815.2.0" } },
        },
      ]

      const edited = [
        {
          name: "worker-1",
          machineType: "m1.large",
          machineImage: { name: "ubuntu", version: "20.04" },
          minimum: 1,
          maximum: 3,
          zones: ["zone-a"],
        },
      ]

      const result = mergeWorkers(existing, edited)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ name: "worker-1" })
    })
  })

  describe("buildUpdatePatch", () => {
    it("patches only autoUpdate when only that field is provided", () => {
      const currentShoot: Shoot = {
        metadata: {
          name: "test",
          resourceVersion: "12345",
        },
        spec: {},
        status: {},
      }

      const input = {
        project_id: "p-1",
        landscape: "qa" as const,
        name: "test",
        autoUpdate: {
          os: true,
          kubernetes: false,
        },
      }

      const patch = buildUpdatePatch(input, currentShoot)

      expect(patch).toEqual({
        metadata: {
          resourceVersion: "12345",
        },
        spec: {
          maintenance: {
            autoUpdate: {
              machineImageVersion: true,
              kubernetesVersion: false,
            },
          },
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing internal patch structure
      expect((patch.spec as any).kubernetes).toBeUndefined()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing internal patch structure
      expect((patch.spec as any).provider).toBeUndefined()
    })

    it("patches kubernetes version", () => {
      const currentShoot: Shoot = {
        metadata: {
          name: "test",
          resourceVersion: "12345",
        },
        spec: {},
        status: {},
      }

      const input = {
        project_id: "p-1",
        landscape: "qa" as const,
        name: "test",
        kubernetesVersion: "1.30.3",
      }

      const patch = buildUpdatePatch(input, currentShoot)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing internal patch structure
      expect((patch.spec as any).kubernetes).toEqual({ version: "1.30.3" })
    })

    it("patches workers with merge", () => {
      const currentShoot: Shoot = {
        metadata: {
          name: "test",
          resourceVersion: "12345",
        },
        spec: {
          provider: {
            workers: [
              {
                name: "worker-1",
                minimum: 1,
                maximum: 3,
                zones: ["zone-a"],
                machine: { type: "m1.large", image: { name: "ubuntu", version: "20.04" } },
              },
            ],
          },
        },
        status: {},
      }

      const input = {
        project_id: "p-1",
        landscape: "qa" as const,
        name: "test",
        workers: [
          {
            name: "worker-1",
            machineType: "m1.large",
            machineImage: { name: "ubuntu", version: "20.04" },
            minimum: 2,
            maximum: 5,
            zones: ["zone-a"],
          },
        ],
      }

      const patch = buildUpdatePatch(input, currentShoot)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing internal patch structure
      expect((patch.spec as any).provider.workers).toHaveLength(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing internal patch structure
      expect((patch.spec as any).provider.workers[0]).toMatchObject({
        minimum: 2,
        maximum: 5,
      })
    })

    it("patches maintenance window with timezone conversion", () => {
      const currentShoot: Shoot = {
        metadata: {
          name: "test",
          resourceVersion: "12345",
        },
        spec: {},
        status: {},
      }

      const input = {
        project_id: "p-1",
        landscape: "qa" as const,
        name: "test",
        maintenance: {
          startTime: "22:00",
          endTime: "23:00",
          timezone: "+01:00",
        },
      }

      const patch = buildUpdatePatch(input, currentShoot)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing internal patch structure
      expect((patch.spec as any).maintenance.timeWindow).toEqual({
        begin: "220000+0100",
        end: "230000+0100",
      })
    })
  })
})
