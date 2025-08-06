import { describe, it, expect } from "vitest"
import {
  cloudProfileApiResponseSchema,
  cloudProfileListApiResponseSchema,
  type CloudProfileApiResponse,
  type CloudProfileListApiResponse,
} from "./cloudProfileApiSchema"

describe("cloudProfileApiSchema", () => {
  describe("cloudProfileApiResponseSchema", () => {
    const validCloudProfileApiResponse: CloudProfileApiResponse = {
      metadata: {
        name: "aws-eu-west-1",
        uid: "123e4567-e89b-12d3-a456-426614174000",
        resourceVersion: "12345",
        generation: 1,
        creationTimestamp: "2023-01-01T00:00:00Z",
        labels: {
          "cloudprofile.gardener.cloud/seed-provider": "aws",
          environment: "production",
        },
        annotations: {
          "gardener.cloud/created-by": "gardener-operator",
          "cloudprofile.gardener.cloud/description": "Production AWS cloud profile",
        },
      },
      spec: {
        type: "aws",
        kubernetes: {
          versions: [
            {
              version: "1.28.2",
              classification: "supported",
            },
            {
              version: "1.27.6",
              classification: "supported",
              expirationDate: "2024-12-31T23:59:59Z",
            },
            {
              version: "1.26.9",
              classification: "deprecated",
              expirationDate: "2024-03-31T23:59:59Z",
            },
          ],
        },
        machineImages: [
          {
            name: "gardenlinux",
            updateStrategy: "patch",
            versions: [
              {
                version: "1312.3.0",
                classification: "supported",
                architectures: ["amd64", "arm64"],
                cri: [{ name: "containerd" }, { name: "cri-o" }],
              },
              {
                version: "1273.7.0",
                classification: "deprecated",
                architectures: ["amd64"],
                cri: [{ name: "containerd" }],
                expirationDate: "2024-02-29T23:59:59Z",
              },
            ],
          },
          {
            name: "ubuntu",
            updateStrategy: "minor",
            versions: [
              {
                version: "22.04",
                classification: "supported",
                architectures: ["amd64"],
              },
            ],
          },
        ],
        machineTypes: [
          {
            name: "m5.large",
            architecture: "amd64",
            cpu: "2",
            memory: "8Gi",
            storage: {
              class: "standard",
              size: "20Gi",
              type: "gp3",
            },
            usable: true,
          },
          {
            name: "m6g.medium",
            architecture: "arm64",
            cpu: "1",
            memory: "4Gi",
            gpu: "0",
            usable: true,
          },
          {
            name: "c5.24xlarge",
            architecture: "amd64",
            cpu: "96",
            memory: "192Gi",
            usable: false,
          },
        ],
        regions: [
          {
            name: "eu-west-1",
            zones: [
              {
                name: "eu-west-1a",
                unavailableMachineTypes: ["c5.24xlarge"],
                unavailableVolumeTypes: ["io1"],
              },
              {
                name: "eu-west-1b",
                unavailableMachineTypes: [],
                unavailableVolumeTypes: [],
              },
              {
                name: "eu-west-1c",
              },
            ],
          },
          {
            name: "us-east-1",
            zones: [{ name: "us-east-1a" }, { name: "us-east-1b" }, { name: "us-east-1c" }],
          },
        ],
        volumeTypes: [
          {
            name: "gp3",
            class: "standard",
            usable: true,
          },
          {
            name: "io1",
            class: "premium",
            usable: true,
          },
          {
            name: "st1",
            class: "cold",
            usable: false,
          },
        ],
        bastion: {
          machineImage: {
            name: "gardenlinux",
            version: "1312.3.0",
          },
          machineType: {
            name: "t3.nano",
          },
        },
        providerConfig: {
          defaultClassStoragePolicy: "Delete",
          enableIMDSv2: true,
        },
        seeds: [
          {
            name: "aws-eu-west-1-seed",
            providerConfig: {
              networks: {
                vpc: {
                  cidr: "10.250.0.0/16",
                },
              },
            },
          },
        ],
      },
    }

    it("should successfully validate a complete cloud profile", () => {
      // Act
      const result = cloudProfileApiResponseSchema.safeParse(validCloudProfileApiResponse)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.metadata.name).toBe("aws-eu-west-1")
        expect(result.data.spec.type).toBe("aws")
        expect(result.data.spec.kubernetes.versions).toHaveLength(3)
        expect(result.data.spec.machineImages).toHaveLength(2)
        expect(result.data.spec.machineTypes).toHaveLength(3)
        expect(result.data.spec.regions).toHaveLength(2)
        expect(result.data.spec.volumeTypes).toHaveLength(3)
      }
    })

    it("should validate cloud profile with minimal required fields", () => {
      // Arrange
      const minimalCloudProfile = {
        metadata: {
          name: "minimal-profile",
          uid: "789e0123-e45b-67d8-a901-234567890123",
          resourceVersion: "1",
          creationTimestamp: "2023-01-01T00:00:00Z",
        },
        spec: {
          type: "gcp",
          kubernetes: {
            versions: [{ version: "1.27.0" }],
          },
          machineImages: [
            {
              name: "cos",
              versions: [{ version: "stable" }],
            },
          ],
          machineTypes: [
            {
              name: "n1-standard-1",
              cpu: "1",
              memory: "3.75Gi",
            },
          ],
        },
      }

      // Act
      const result = cloudProfileApiResponseSchema.safeParse(minimalCloudProfile)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.metadata.name).toBe("minimal-profile")
        expect(result.data.spec.type).toBe("gcp")
        expect(result.data.spec.regions).toBeUndefined()
        expect(result.data.spec.volumeTypes).toBeUndefined()
        expect(result.data.spec.bastion).toBeUndefined()
      }
    })

    it("should reject cloud profile with invalid UUID", () => {
      // Arrange
      const invalidProfile = {
        ...validCloudProfileApiResponse,
        metadata: {
          ...validCloudProfileApiResponse.metadata,
          uid: "not-a-valid-uuid",
        },
      }

      // Act
      const result = cloudProfileApiResponseSchema.safeParse(invalidProfile)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["metadata", "uid"])
        expect(result.error.issues[0].code).toBe("invalid_string")
      }
    })

    it("should reject cloud profile with invalid datetime", () => {
      // Arrange
      const invalidProfile = {
        ...validCloudProfileApiResponse,
        metadata: {
          ...validCloudProfileApiResponse.metadata,
          creationTimestamp: "not-a-datetime",
        },
      }

      // Act
      const result = cloudProfileApiResponseSchema.safeParse(invalidProfile)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["metadata", "creationTimestamp"])
        expect(result.error.issues[0].code).toBe("invalid_string")
      }
    })

    it("should reject cloud profile with invalid architecture", () => {
      // Arrange
      const invalidProfile = {
        ...validCloudProfileApiResponse,
        spec: {
          ...validCloudProfileApiResponse.spec,
          machineTypes: [
            {
              name: "invalid-machine",
              architecture: "x86", // Invalid architecture
              cpu: "2",
              memory: "8Gi",
            },
          ],
        },
      }

      // Act
      const result = cloudProfileApiResponseSchema.safeParse(invalidProfile)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["spec", "machineTypes", 0, "architecture"])
        expect(result.error.issues[0].code).toBe("invalid_enum_value")
      }
    })

    it("should reject cloud profile with invalid update strategy", () => {
      // Arrange
      const invalidProfile = {
        ...validCloudProfileApiResponse,
        spec: {
          ...validCloudProfileApiResponse.spec,
          machineImages: [
            {
              name: "invalid-image",
              updateStrategy: "invalid-strategy", // Invalid update strategy
              versions: [{ version: "1.0.0" }],
            },
          ],
        },
      }

      // Act
      const result = cloudProfileApiResponseSchema.safeParse(invalidProfile)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["spec", "machineImages", 0, "updateStrategy"])
        expect(result.error.issues[0].code).toBe("invalid_enum_value")
      }
    })

    it("should validate cloud profile with optional fields missing", () => {
      // Arrange
      const profileWithoutOptionals = {
        metadata: {
          name: "no-optionals",
          uid: "abc12345-def6-789a-bcde-f123456789ab",
          resourceVersion: "1",
          creationTimestamp: "2023-01-01T00:00:00Z",
          // No labels, annotations, generation
        },
        spec: {
          type: "azure",
          kubernetes: {
            versions: [{ version: "1.27.3" }], // No classification, expirationDate
          },
          machineImages: [
            {
              name: "ubuntu",
              // No updateStrategy
              versions: [
                {
                  version: "20.04",
                  // No classification, expirationDate, architectures, cri
                },
              ],
            },
          ],
          machineTypes: [
            {
              name: "Standard_B2s",
              // No architecture, gpu, storage, usable
              cpu: "2",
              memory: "4Gi",
            },
          ],
          // No regions, volumeTypes, bastion, providerConfig, seeds
        },
      }

      // Act
      const result = cloudProfileApiResponseSchema.safeParse(profileWithoutOptionals)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.metadata.labels).toBeUndefined()
        expect(result.data.spec.regions).toBeUndefined()
        expect(result.data.spec.volumeTypes).toBeUndefined()
        expect(result.data.spec.bastion).toBeUndefined()
      }
    })
  })

  describe("cloudProfileListApiResponseSchema", () => {
    const validCloudProfileListResponse: CloudProfileListApiResponse = {
      apiVersion: "core.gardener.cloud/v1beta1",
      kind: "CloudProfileList",
      metadata: {
        resourceVersion: "12345",
      },
      items: [
        {
          metadata: {
            name: "aws-profile",
            uid: "123e4567-e89b-12d3-a456-426614174000",
            resourceVersion: "1",
            creationTimestamp: "2023-01-01T00:00:00Z",
          },
          spec: {
            type: "aws",
            kubernetes: {
              versions: [{ version: "1.27.3" }],
            },
            machineImages: [
              {
                name: "gardenlinux",
                versions: [{ version: "934.8.0" }],
              },
            ],
            machineTypes: [
              {
                name: "m5.large",
                cpu: "2",
                memory: "8Gi",
              },
            ],
          },
        },
        {
          metadata: {
            name: "gcp-profile",
            uid: "456e7890-e12b-34d5-a678-901234567890",
            resourceVersion: "2",
            creationTimestamp: "2023-01-02T00:00:00Z",
          },
          spec: {
            type: "gcp",
            kubernetes: {
              versions: [{ version: "1.27.3" }],
            },
            machineImages: [
              {
                name: "cos",
                versions: [{ version: "stable" }],
              },
            ],
            machineTypes: [
              {
                name: "n1-standard-2",
                cpu: "2",
                memory: "7.5Gi",
              },
            ],
          },
        },
      ],
    }

    it("should successfully validate a cloud profile list", () => {
      // Act
      const result = cloudProfileListApiResponseSchema.safeParse(validCloudProfileListResponse)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apiVersion).toBe("core.gardener.cloud/v1beta1")
        expect(result.data.kind).toBe("CloudProfileList")
        expect(result.data.items).toHaveLength(2)
        expect(result.data.items[0].metadata.name).toBe("aws-profile")
        expect(result.data.items[1].metadata.name).toBe("gcp-profile")
      }
    })

    it("should validate empty cloud profile list", () => {
      // Arrange
      const emptyListResponse = {
        apiVersion: "core.gardener.cloud/v1beta1" as const,
        kind: "CloudProfileList" as const,
        metadata: {
          resourceVersion: "12345",
        },
        items: [],
      }

      // Act
      const result = cloudProfileListApiResponseSchema.safeParse(emptyListResponse)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.items).toHaveLength(0)
      }
    })

    it("should reject list with wrong apiVersion", () => {
      // Arrange
      const invalidListResponse = {
        ...validCloudProfileListResponse,
        apiVersion: "wrong.api.version/v1",
      }

      // Act
      const result = cloudProfileListApiResponseSchema.safeParse(invalidListResponse)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["apiVersion"])
        expect(result.error.issues[0].code).toBe("invalid_literal")
      }
    })

    it("should reject list with wrong kind", () => {
      // Arrange
      const invalidListResponse = {
        ...validCloudProfileListResponse,
        kind: "WrongKind",
      }

      // Act
      const result = cloudProfileListApiResponseSchema.safeParse(invalidListResponse)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["kind"])
        expect(result.error.issues[0].code).toBe("invalid_literal")
      }
    })

    it("should reject list with invalid cloud profile item", () => {
      // Arrange
      const invalidListResponse = {
        ...validCloudProfileListResponse,
        items: [
          {
            metadata: {
              name: "invalid-profile",
              // Missing required fields
            },
            spec: {
              // Missing required fields
            },
          },
        ],
      }

      // Act
      const result = cloudProfileListApiResponseSchema.safeParse(invalidListResponse)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
        expect(result.error.issues[0].path[0]).toBe("items")
        expect(result.error.issues[0].path[1]).toBe(0)
      }
    })
  })
})
