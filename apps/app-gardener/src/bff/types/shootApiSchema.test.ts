import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  shootApiResponseSchema,
  shootListApiResponseSchema,
  type ShootApiResponse,
  type ShootListApiResponse,
} from "./shootApiSchema"

describe("Shoot API Response Schema", () => {
  const createValidShootData = (): ShootApiResponse => ({
    metadata: {
      name: "test-shoot",
      namespace: "garden-test",
      uid: "123e4567-e89b-12d3-a456-426614174000",
      resourceVersion: "12345",
      generation: 1,
      creationTimestamp: "2023-01-01T00:00:00Z",
      labels: {
        "app.kubernetes.io/name": "gardener",
        "project.gardener.cloud/name": "test-project",
      },
      annotations: {
        "gardener.cloud/created-by": "test-user",
      },
      finalizers: ["gardener"],
    },
    spec: {
      cloudProfileName: "aws",
      kubernetes: {
        version: "1.27.3",
      },
      networking: {
        type: "calico",
        pods: "10.244.0.0/16",
        nodes: "10.250.0.0/16",
        services: "10.96.0.0/12",
        ipFamilies: ["IPv4"],
      },
      provider: {
        type: "aws",
        controlPlaneConfig: {
          iamInstanceProfile: "gardener-control-plane",
        },
        infrastructureConfig: {
          networks: {
            vpc: {
              cidr: "10.250.0.0/16",
            },
          },
        },
        workers: [
          {
            cri: {
              name: "containerd",
            },
            name: "worker-1",
            machine: {
              type: "m5.large",
              image: {
                name: "gardenlinux",
                version: "934.8.0",
              },
              architecture: "amd64",
            },
            maximum: 3,
            minimum: 1,
            maxSurge: 1,
            maxUnavailable: 0,
            zones: ["us-west-2a", "us-west-2b"],
            systemComponents: {
              allow: true,
            },
            updateStrategy: "RollingUpdate",
          },
        ],
      },
      region: "us-west-2",
    },
  })

  describe("Valid data", () => {
    it("should validate a complete valid shoot response", () => {
      const validData = createValidShootData()
      const result = shootApiResponseSchema.safeParse(validData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.metadata.name).toBe("test-shoot")
        expect(result.data.spec.kubernetes.version).toBe("1.27.3")
      }
    })

    it("should validate with minimal required fields", () => {
      const minimalData = {
        metadata: {
          name: "minimal-shoot",
          namespace: "garden-test",
          uid: "123e4567-e89b-12d3-a456-426614174000",
          resourceVersion: "1",
          generation: 1,
          creationTimestamp: "2023-01-01T00:00:00Z",
        },
        spec: {
          cloudProfileName: "aws",
          kubernetes: {
            version: "1.27.3",
          },
          networking: {
            type: "calico",
            pods: "10.244.0.0/16",
            nodes: "10.250.0.0/16",
            services: "10.96.0.0/12",
            ipFamilies: ["IPv4"],
          },
          provider: {
            type: "aws",
            controlPlaneConfig: {},
            infrastructureConfig: {},
            workers: [
              {
                cri: { name: "containerd" },
                name: "worker-1",
                machine: {
                  type: "m5.large",
                  image: { name: "gardenlinux", version: "934.8.0" },
                  architecture: "amd64",
                },
                maximum: 1,
                minimum: 1,
                maxSurge: 0,
                maxUnavailable: 0,
                zones: ["us-west-2a"],
                systemComponents: { allow: true },
                updateStrategy: "RollingUpdate",
              },
            ],
          },
          region: "us-west-2",
        },
      }

      const result = shootApiResponseSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it("should validate with optional status fields", () => {
      const dataWithStatus = {
        ...createValidShootData(),
        status: {
          conditions: [
            {
              type: "APIServerAvailable",
              status: "True",
              lastTransitionTime: "2023-01-01T00:00:00Z",
              lastUpdateTime: "2023-01-01T00:00:00Z",
              reason: "Available",
              message: "API server is available",
            },
          ],
          hibernated: false,
          lastOperation: {
            description: "Creating shoot cluster",
            lastUpdateTime: "2023-01-01T00:00:00Z",
            progress: 50,
            state: "Processing",
            type: "Create",
          },
          observedGeneration: 1,
          technicalID: "shoot--garden-test--test-shoot",
        },
      }

      const result = shootApiResponseSchema.safeParse(dataWithStatus)
      expect(result.success).toBe(true)
    })
  })

  describe("Invalid data", () => {
    it("should reject when required metadata fields are missing", () => {
      const invalidData = {
        metadata: {
          name: "test-shoot",
          // missing required fields
        },
        spec: {
          // valid spec...
        },
      }

      const result = shootApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid UUID in metadata.uid", () => {
      const invalidData = {
        ...createValidShootData(),
        metadata: {
          ...createValidShootData().metadata,
          uid: "not-a-valid-uuid",
        },
      }

      const result = shootApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["metadata", "uid"])
      }
    })

    it("should reject invalid datetime in creationTimestamp", () => {
      const invalidData = {
        ...createValidShootData(),
        metadata: {
          ...createValidShootData().metadata,
          creationTimestamp: "not-a-datetime",
        },
      }

      const result = shootApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject negative generation", () => {
      const invalidData = {
        ...createValidShootData(),
        metadata: {
          ...createValidShootData().metadata,
          generation: -1,
        },
      }

      const result = shootApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid worker configuration", () => {
      const invalidData = {
        ...createValidShootData(),
        spec: {
          ...createValidShootData().spec,
          provider: {
            ...createValidShootData().spec.provider,
            workers: [
              {
                cri: { name: "containerd" },
                name: "worker-1",
                machine: {
                  type: "m5.large",
                  image: { name: "gardenlinux", version: "934.8.0" },
                  architecture: "invalid-arch", // invalid architecture
                },
                maximum: -1, // invalid maximum
                minimum: 1,
                maxSurge: 0,
                maxUnavailable: 0,
                zones: ["us-west-2a"],
                systemComponents: { allow: true },
                updateStrategy: "RollingUpdate",
              },
            ],
          },
        },
      }

      const result = shootApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid networking IP families", () => {
      const invalidData = {
        ...createValidShootData(),
        spec: {
          ...createValidShootData().spec,
          networking: {
            ...createValidShootData().spec.networking,
            ipFamilies: ["IPv5"], // invalid IP family
          },
        },
      }

      const result = shootApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid operation state", () => {
      const invalidData = {
        ...createValidShootData(),
        status: {
          lastOperation: {
            description: "Test operation",
            lastUpdateTime: "2023-01-01T00:00:00Z",
            progress: 150, // invalid progress > 100
            state: "InvalidState", // invalid state
            type: "Create",
          },
        },
      }

      const result = shootApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("Edge cases", () => {
    it("should handle empty arrays correctly", () => {
      const dataWithEmptyArrays = {
        ...createValidShootData(),
        spec: {
          ...createValidShootData().spec,
          extensions: [], // empty array should be valid
        },
        status: {
          conditions: [],
          lastErrors: [],
        },
      }

      const result = shootApiResponseSchema.safeParse(dataWithEmptyArrays)
      expect(result.success).toBe(true)
    })

    it("should handle both IPv4 and IPv6 families", () => {
      const dualStackData = {
        ...createValidShootData(),
        spec: {
          ...createValidShootData().spec,
          networking: {
            ...createValidShootData().spec.networking,
            ipFamilies: ["IPv4", "IPv6"],
          },
        },
      }

      const result = shootApiResponseSchema.safeParse(dualStackData)
      expect(result.success).toBe(true)
    })

    it("should validate percentage fields correctly", () => {
      const dataWithPercentages = {
        ...createValidShootData(),
        spec: {
          ...createValidShootData().spec,
          kubernetes: {
            ...createValidShootData().spec.kubernetes,
            kubelet: {
              imageGCHighThresholdPercent: 85,
              imageGCLowThresholdPercent: 80,
            },
          },
        },
      }

      const result = shootApiResponseSchema.safeParse(dataWithPercentages)
      expect(result.success).toBe(true)
    })

    it("should reject percentages outside 0-100 range", () => {
      const invalidPercentageData = {
        ...createValidShootData(),
        spec: {
          ...createValidShootData().spec,
          kubernetes: {
            ...createValidShootData().spec.kubernetes,
            kubelet: {
              imageGCHighThresholdPercent: 150, // invalid percentage
            },
          },
        },
      }

      const result = shootApiResponseSchema.safeParse(invalidPercentageData)
      expect(result.success).toBe(false)
    })
  })
})

describe("Shoot List API Response Schema", () => {
  it("should validate a valid shoot list response", () => {
    const validListData: ShootListApiResponse = {
      apiVersion: "core.gardener.cloud/v1beta1",
      kind: "ShootList",
      metadata: {
        resourceVersion: "12345",
        selfLink: "/api/v1beta1/shoots",
      },
      items: [
        {
          metadata: {
            name: "shoot-1",
            namespace: "garden-test",
            uid: "123e4567-e89b-12d3-a456-426614174000",
            resourceVersion: "1",
            generation: 1,
            creationTimestamp: "2023-01-01T00:00:00Z",
          },
          spec: {
            cloudProfileName: "aws",
            kubernetes: { version: "1.27.3" },
            networking: {
              type: "calico",
              pods: "10.244.0.0/16",
              nodes: "10.250.0.0/16",
              services: "10.96.0.0/12",
              ipFamilies: ["IPv4"],
            },
            provider: {
              type: "aws",
              controlPlaneConfig: {},
              infrastructureConfig: {},
              workers: [
                {
                  cri: { name: "containerd" },
                  name: "worker-1",
                  machine: {
                    type: "m5.large",
                    image: { name: "gardenlinux", version: "934.8.0" },
                    architecture: "amd64",
                  },
                  maximum: 1,
                  minimum: 1,
                  maxSurge: 0,
                  maxUnavailable: 0,
                  zones: ["us-west-2a"],
                  systemComponents: { allow: true },
                  updateStrategy: "RollingUpdate",
                },
              ],
            },
            region: "us-west-2",
          },
        },
      ],
    }

    const result = shootListApiResponseSchema.safeParse(validListData)
    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.items).toHaveLength(1)
      expect(result.data.items[0].metadata.name).toBe("shoot-1")
    }
  })

  it("should validate empty shoot list", () => {
    const emptyListData = {
      apiVersion: "core.gardener.cloud/v1beta1",
      kind: "ShootList",
      metadata: {
        resourceVersion: "12345",
      },
      items: [],
    }

    const result = shootListApiResponseSchema.safeParse(emptyListData)
    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.items).toHaveLength(0)
    }
  })

  it("should reject list with invalid shoot items", () => {
    const invalidListData = {
      apiVersion: "core.gardener.cloud/v1beta1",
      kind: "ShootList",
      metadata: {
        resourceVersion: "12345",
      },
      items: [
        {
          metadata: {
            name: "invalid-shoot",
            // missing required fields
          },
        },
      ],
    }

    const result = shootListApiResponseSchema.safeParse(invalidListData)
    expect(result.success).toBe(false)
  })
})

describe("Type inference", () => {
  it("should infer correct TypeScript types", () => {
    const validShoot = {
      metadata: {
        name: "test-shoot",
        namespace: "garden-test",
        uid: "123e4567-e89b-12d3-a456-426614174000",
        resourceVersion: "1",
        generation: 1,
        creationTimestamp: "2023-01-01T00:00:00Z",
      },
      spec: {
        cloudProfileName: "aws",
        kubernetes: { version: "1.27.3" },
        networking: {
          type: "calico",
          pods: "10.244.0.0/16",
          nodes: "10.250.0.0/16",
          services: "10.96.0.0/12",
          ipFamilies: ["IPv4" as const],
        },
        provider: {
          type: "aws",
          controlPlaneConfig: {},
          infrastructureConfig: {},
          workers: [
            {
              cri: { name: "containerd" },
              name: "worker-1",
              machine: {
                type: "m5.large",
                image: { name: "gardenlinux", version: "934.8.0" },
                architecture: "amd64" as const,
              },
              maximum: 1,
              minimum: 1,
              maxSurge: 0,
              maxUnavailable: 0,
              zones: ["us-west-2a"],
              systemComponents: { allow: true },
              updateStrategy: "RollingUpdate" as const,
            },
          ],
        },
        region: "us-west-2",
      },
    }

    const parsed = shootApiResponseSchema.parse(validShoot)

    // TypeScript should infer these types correctly
    expect(typeof parsed.metadata.name).toBe("string")
    expect(typeof parsed.spec.provider.workers[0].machine.architecture).toBe("string")
    expect(parsed.spec.networking.ipFamilies[0]).toBe("IPv4")
  })
})
