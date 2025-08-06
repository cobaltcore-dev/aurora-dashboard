import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { cloudProfilesRouter } from "./cloudProfilesRouter"
import { CloudProfile } from "../types/cloudProfile"
import { client } from "../client"
import { CloudProfileApiResponse } from "../types/cloudProfileApiSchema"

import { createCallerFactory, router } from "../../trpc"
import { AuroraPortalContext } from "../../context"

// Mock the K8s client
vi.mock("../client", () => ({
  client: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    WATCH_ADDED: "ADDED",
    WATCH_MODIFIED: "MODIFIED",
    WATCH_DELETED: "DELETED",
    WATCH_ERROR: "ERROR",
    watch: vi.fn().mockReturnValue({
      on: vi.fn(),
      off: vi.fn(),
      close: vi.fn(),
    }),
    head: vi.fn(),
    refreshToken: vi.fn(),
    currentToken: vi.fn(),
  },
}))

const mockClient = vi.mocked(client)

// Create tRPC caller
const createCaller = createCallerFactory(router(cloudProfilesRouter))
const caller = createCaller({} as AuroraPortalContext)

describe("cloudProfilesRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    // Set default environment variable
    process.env.GARDENER_PROJECT = "test-project"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getCloudProfiles", () => {
    const validCloudProfileApiResponseMock: CloudProfileApiResponse = {
      metadata: {
        name: "aws-eu-west-1",
        uid: "123e4567-e89b-12d3-a456-426614174000",
        resourceVersion: "12345",
        generation: 1,
        creationTimestamp: "2023-01-01T00:00:00Z",
        labels: {
          "cloudprofile.gardener.cloud/seed-provider": "aws",
        },
        annotations: {
          "gardener.cloud/created-by": "gardener-operator",
        },
      },
      spec: {
        type: "aws",
        kubernetes: {
          versions: [
            {
              version: "1.27.3",
              classification: "supported",
            },
            {
              version: "1.26.8",
              classification: "supported",
              expirationDate: "2024-12-31T23:59:59Z",
            },
          ],
        },
        machineImages: [
          {
            name: "gardenlinux",
            updateStrategy: "patch",
            versions: [
              {
                version: "934.8.0",
                classification: "supported",
                architectures: ["amd64"],
                cri: [{ name: "containerd" }],
              },
              {
                version: "934.7.0",
                classification: "deprecated",
                expirationDate: "2024-06-30T23:59:59Z",
                architectures: ["amd64", "arm64"],
                cri: [{ name: "containerd" }, { name: "docker" }],
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
        ],
        regions: [
          {
            name: "eu-west-1",
            zones: [
              {
                name: "eu-west-1a",
                unavailableMachineTypes: ["m5.large"],
                unavailableVolumeTypes: ["io1"],
              },
              {
                name: "eu-west-1b",
                unavailableMachineTypes: [],
                unavailableVolumeTypes: [],
              },
            ],
          },
          {
            name: "us-west-2",
            zones: [{ name: "us-west-2a" }, { name: "us-west-2b" }],
          },
        ],
        volumeTypes: [
          {
            name: "gp3",
            class: "standard",
            usable: true,
          },
          {
            name: "io2",
            class: "premium",
            usable: false,
          },
        ],
        bastion: {
          machineImage: {
            name: "gardenlinux",
            version: "934.8.0",
          },
          machineType: {
            name: "t3.nano",
          },
        },
        providerConfig: {
          defaultClassStoragePolicy: "Delete",
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

    const validApiResponseMock = {
      apiVersion: "core.gardener.cloud/v1beta1" as const,
      kind: "CloudProfileList" as const,
      metadata: {
        resourceVersion: "12345",
      },
      items: [validCloudProfileApiResponseMock],
    }

    const cloudProfiles: CloudProfile[] = [
      {
        uid: "123e4567-e89b-12d3-a456-426614174000",
        name: "aws-eu-west-1",
        provider: "aws",
        kubernetesVersions: ["1.27.3", "1.26.8"],
        machineTypes: [
          {
            name: "m5.large",
            architecture: "amd64",
            cpu: "2",
            memory: "8Gi",
          },
          {
            name: "m6g.medium",
            architecture: "arm64",
            cpu: "1",
            memory: "4Gi",
          },
        ],
        machineImages: [
          {
            name: "gardenlinux",
            versions: ["934.8.0", "934.7.0"],
          },
        ],
        regions: [
          {
            name: "eu-west-1",
            zones: ["eu-west-1a", "eu-west-1b"],
          },
          {
            name: "us-west-2",
            zones: ["us-west-2a", "us-west-2b"],
          },
        ],
        volumeTypes: ["gp3", "io2"],
      },
    ]

    it("should successfully fetch and convert cloud profiles", async () => {
      // Arrange
      vi.mocked(mockClient.get).mockResolvedValue(validApiResponseMock)

      // Act
      const result = await caller.getCloudProfiles()

      // Assert
      expect(mockClient.get).toHaveBeenCalledWith("apis/core.gardener.cloud/v1beta1/cloudprofiles")
      expect(result).toEqual(cloudProfiles)
    })
  })
})
