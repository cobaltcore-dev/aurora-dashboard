import { describe, it, expect } from "vitest"
import { shootToCluster } from "./clusterMapper"
import type { Shoot } from "../types/shoot"

const minimalShoot: Shoot = {
  metadata: {
    name: "test-cluster",
  },
}

const fullShoot: Shoot = {
  metadata: {
    name: "healthy-cluster",
    namespace: "garden-qa-de-1-p-1",
    uid: "abc-123",
    labels: {
      "shoot.gardener.cloud/status": "healthy",
    },
    annotations: {
      "gardener.cloud/created-by": "user@example.com",
    },
  },
  spec: {
    region: "qa-de-1",
    cloudProfile: {
      name: "openstack",
    },
    kubernetes: {
      version: "1.30.2",
    },
    addons: {
      "nginx-ingress": { enabled: true },
      "kube-lego": { enabled: false },
    },
    provider: {
      type: "openstack",
      workers: [
        {
          name: "worker-1",
          minimum: 2,
          maximum: 5,
          machine: {
            type: "m1.large",
            image: {
              name: "ubuntu",
              version: "20.04",
            },
          },
          zones: ["eu-de-1a", "eu-de-1b"],
        },
        {
          name: "worker-2",
          minimum: 1,
          maximum: 3,
          machine: {
            type: "m1.medium",
            image: {
              name: "ubuntu",
              version: "20.04",
            },
          },
          zones: ["eu-de-1a"],
        },
      ],
    },
    maintenance: {
      timeWindow: {
        begin: "220000+0100",
        end: "230000+0100",
      },
      autoUpdate: {
        machineImageVersion: true,
        kubernetesVersion: false,
      },
    },
  },
  status: {
    conditions: [
      { type: "APIServerAvailable", status: "True" },
      { type: "ControlPlaneHealthy", status: "True" },
      { type: "EveryNodeReady", status: "False", message: "Node not ready" },
    ],
    lastOperation: {
      type: "Reconcile",
      state: "Succeeded",
      progress: 100,
      description: "Reconciliation completed",
      lastUpdateTime: "2026-11-19T10:00:00Z",
    },
    lastErrors: [
      {
        description: "Network timeout",
        taskID: "task-123",
        lastUpdateTime: "2026-11-19T09:00:00Z",
      },
      {
        // Missing taskID, should be filtered out
        description: "Other error",
      },
    ],
  },
}

describe("shootToCluster", () => {
  it("maps a minimal shoot without throwing", () => {
    const cluster = shootToCluster(minimalShoot, { includeRaw: false })
    expect(cluster.name).toBe("test-cluster")
    expect(cluster.status).toBe("unknown")
    expect(cluster.isDeleted).toBe(false)
    expect(cluster.addOns).toEqual([])
  })

  it("maps a full shoot correctly", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.name).toBe("healthy-cluster")
    expect(cluster.namespace).toBe("garden-qa-de-1-p-1")
    expect(cluster.uid).toBe("abc-123")
    expect(cluster.status).toBe("healthy")
    expect(cluster.region).toBe("qa-de-1")
    expect(cluster.infrastructure).toBe("openstack")
    expect(cluster.version).toBe("1.30.2")
    expect(cluster.createdBy).toBe("user@example.com")
    expect(cluster.cloudProfileName).toBe("openstack")
  })

  it("maps status label to cluster status", () => {
    const shoot = {
      ...minimalShoot,
      metadata: { ...minimalShoot.metadata, labels: { "shoot.gardener.cloud/status": "progressing" } },
    }
    expect(shootToCluster(shoot, { includeRaw: false }).status).toBe("progressing")
  })

  it("defaults unknown status labels to unknown", () => {
    const shoot = {
      ...minimalShoot,
      metadata: { ...minimalShoot.metadata, labels: { "shoot.gardener.cloud/status": "weird" } },
    }
    expect(shootToCluster(shoot, { includeRaw: false }).status).toBe("unknown")
  })

  it("sets isDeleted when deletionTimestamp is present", () => {
    const shoot = { ...minimalShoot, metadata: { ...minimalShoot.metadata, deletionTimestamp: "2026-11-19T10:00:00Z" } }
    expect(shootToCluster(shoot, { includeRaw: false }).isDeleted).toBe(true)
  })

  it("maps readiness conditions with display values", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.readiness.status).toBe("2/3")
    expect(cluster.readiness.conditions).toEqual([
      { displayValue: "API", type: "APIServerAvailable", status: "True" },
      { displayValue: "CP", type: "ControlPlaneHealthy", status: "True" },
      { displayValue: "N", type: "EveryNodeReady", status: "False", message: "Node not ready" },
    ])
  })

  it("builds lastOperationSummary", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.lastOperationSummary).toBe("Reconcile Succeeded (100%)")
  })

  it("filters lastErrors to those with description and taskID", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.lastErrors).toEqual([
      {
        description: "Network timeout",
        taskID: "task-123",
        lastUpdateTime: "2026-11-19T09:00:00Z",
      },
    ])
  })

  it("extracts enabled add-ons", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.addOns).toEqual(["nginx-ingress"])
  })

  it("converts maintenance times", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.maintenance.startTime).toBe("22:00")
    expect(cluster.maintenance.endTime).toBe("23:00")
    expect(cluster.maintenance.timezone).toBe("+01:00")
  })

  it("maps autoUpdate", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.autoUpdate).toEqual({ os: true, kubernetes: false })
  })

  it("maps workers", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.workers).toHaveLength(2)
    expect(cluster.workers[0]).toMatchObject({
      name: "worker-1",
      machineType: "m1.large",
      machineImage: { name: "ubuntu", version: "20.04" },
      min: 2,
      max: 5,
      zones: ["eu-de-1a", "eu-de-1b"],
    })
  })

  it("includes raw when requested", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: true })
    expect(cluster.raw).toBeDefined()
    expect(cluster.raw).toEqual(fullShoot)
  })

  it("excludes raw when not requested", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.raw).toBeUndefined()
  })

  it("computes versionUpdates when versionsByProfile is provided", () => {
    const versionsByProfile = new Map([["openstack", ["1.30.5", "1.30.3", "1.31.1", "2.0.0"]]])
    const cluster = shootToCluster(fullShoot, { versionsByProfile, includeRaw: false })
    expect(cluster.versionUpdates).toEqual({
      patch: ["1.30.5", "1.30.3"],
      minor: ["1.31.1"],
      major: ["2.0.0"],
    })
  })

  it("sets versionUpdates to null when versionsByProfile is absent", () => {
    const cluster = shootToCluster(fullShoot, { includeRaw: false })
    expect(cluster.versionUpdates).toBeNull()
  })

  it("uses spec.cloudProfileName for older shoots", () => {
    const shoot = {
      ...fullShoot,
      spec: {
        ...fullShoot.spec,
        cloudProfile: undefined,
        cloudProfileName: "legacy-profile",
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing legacy shoot format
    const cluster = shootToCluster(shoot as any, { includeRaw: false })
    expect(cluster.cloudProfileName).toBe("legacy-profile")
  })
})
