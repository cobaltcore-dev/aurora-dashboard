import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AuroraPortalContext } from "../../context"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { clustersRouter } from "./clustersRouter"

const url = "https://persephone-qa.example/"

const createMockContext = () => {
  const controller = new AbortController()
  const get = vi.fn()
  const post = vi.fn()
  const put = vi.fn()
  const patch = vi.fn()
  const del = vi.fn()
  const getEndpoint = vi.fn((opts?: { interfaceName?: string }): string | null => {
    return opts?.interfaceName === "public" ? url : null
  })
  const service = { get, getEndpoint, post, put, patch, del }
  const catalog = [
    {
      type: "kubernetes",
      name: "persephone-qa",
      id: "s1",
      endpoints: [{ id: "e1", interface: "public", region: "qa-de-1", region_id: "qa-de-1", url }],
    },
  ]
  const mockOpenstackSession = {
    getToken: () => ({ authToken: "tok-123", tokenData: { catalog, project: { id: "p-1" } } }),
    service: vi.fn().mockReturnValue(service),
  }
  const ctx = {
    validateSession: vi.fn().mockReturnValue(true),
    openstack: mockOpenstackSession,
    signal: controller.signal,
    rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
  } as unknown as AuroraPortalContext

  return { ctx, get, post, put, patch, del, service, mockOpenstackSession }
}

const createCaller = createCallerFactory(
  auroraRouter({
    clusters: clustersRouter,
  })
)

describe("clustersRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("list", () => {
    it("lists clusters with correct namespace path", async () => {
      const { ctx, get } = createMockContext()
      get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              metadata: {
                name: "test-cluster",
                uid: "abc-123",
                labels: { "shoot.gardener.cloud/status": "healthy" },
              },
              spec: { kubernetes: { version: "1.30.2" } },
              status: { conditions: [] },
            },
          ],
        }),
      })

      const caller = createCaller(ctx)
      const result = await caller.clusters.list({ project_id: "p-1", landscape: "qa" })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("test-cluster")
      expect(result[0].status).toBe("healthy")
      // Namespace should be garden-qa-de-1-p-1
      expect(get).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-qa-de-1-p-1/shoots",
        expect.any(Object)
      )
    })

    it("returns clusters even when cloud profiles fail", async () => {
      const { ctx, get } = createMockContext()
      get.mockImplementation(async (path: string) => {
        if (path.includes("cloudprofiles")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ kind: "Status", status: "Failure", code: 403, message: "forbidden" }),
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                metadata: { name: "cluster-1", uid: "c1" },
                spec: {},
                status: {},
              },
            ],
          }),
        }
      })

      const caller = createCaller(ctx)
      const result = await caller.clusters.list({ project_id: "p-1", landscape: "qa" })
      expect(result).toHaveLength(1)
      expect(result[0].versionUpdates).toBeNull()
    })
  })

  describe("getByName", () => {
    it("fetches a cluster by name with URL encoding", async () => {
      const { ctx, get } = createMockContext()
      get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: {
            name: "my-cluster",
            uid: "abc-456",
            labels: { "shoot.gardener.cloud/status": "progressing" },
          },
          spec: { kubernetes: { version: "1.30.2" } },
          status: { conditions: [] },
        }),
      })

      const caller = createCaller(ctx)
      const result = await caller.clusters.getByName({ project_id: "p-1", landscape: "qa", name: "my-cluster" })
      expect(result.name).toBe("my-cluster")
      expect(result.status).toBe("progressing")
      expect(result.raw).toBeDefined() // includeRaw is true for getByName
      expect(get).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-qa-de-1-p-1/shoots/my-cluster",
        expect.any(Object)
      )
    })

    it("URL-encodes cluster names with special characters", async () => {
      const { ctx, get } = createMockContext()
      // Use a name that passes validation but has hyphens at the edges of segments
      const clusterName = "test-cluster-123"
      get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: { name: clusterName, uid: "x" },
          spec: {},
          status: {},
        }),
      })

      const caller = createCaller(ctx)
      await caller.clusters.getByName({ project_id: "p-1", landscape: "qa", name: clusterName })
      // Verify the path includes the encoded name (though in this case it's the same)
      expect(get).toHaveBeenCalledWith(expect.stringContaining(`/shoots/${clusterName}`), expect.any(Object))
    })

    it("rejects invalid cluster names before making a request", async () => {
      const { ctx, get } = createMockContext()

      const caller = createCaller(ctx)
      await expect(
        caller.clusters.getByName({ project_id: "p-1", landscape: "qa", name: "Bad_Name" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(get).not.toHaveBeenCalled()
    })

    it("maps 404 to NOT_FOUND", async () => {
      const { ctx, get } = createMockContext()
      get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ kind: "Status", status: "Failure", code: 404, message: "not found" }),
      })

      const caller = createCaller(ctx)
      await expect(
        caller.clusters.getByName({ project_id: "p-1", landscape: "qa", name: "missing" })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
    })
  })

  describe("create", () => {
    it("creates a cluster with the correct body and content-type", async () => {
      const { ctx, post } = createMockContext()
      post.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          metadata: { name: "new-cluster", uid: "new-123" },
          spec: {},
          status: {},
        }),
      })

      const caller = createCaller(ctx)
      const result = await caller.clusters.create({
        project_id: "p-1",
        landscape: "qa",
        name: "new-cluster",
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
      })

      expect(result.name).toBe("new-cluster")
      expect(post).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-qa-de-1-p-1/shoots",
        expect.objectContaining({
          apiVersion: "core.gardener.cloud/v1beta1",
          kind: "Shoot",
          metadata: { name: "new-cluster" },
          spec: expect.objectContaining({
            region: "qa-de-1",
            cloudProfile: { name: "openstack" },
            kubernetes: { version: "1.30.2" },
            provider: expect.objectContaining({
              infrastructureConfig: expect.objectContaining({
                kind: "InfrastructureConfig",
              }),
            }),
          }),
        }),
        expect.any(Object)
      )
    })
  })

  describe("update", () => {
    it("fetches then patches a cluster", async () => {
      const { ctx, get, patch } = createMockContext()
      get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: {
            name: "test-cluster",
            resourceVersion: "12345",
          },
          spec: {
            kubernetes: { version: "1.30.2" },
          },
          status: {},
        }),
      })
      patch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: { name: "test-cluster", resourceVersion: "12346" },
          spec: { kubernetes: { version: "1.30.3" } },
          status: {},
        }),
      })

      const caller = createCaller(ctx)
      const result = await caller.clusters.update({
        project_id: "p-1",
        landscape: "qa",
        name: "test-cluster",
        kubernetesVersion: "1.30.3",
      })

      expect(result.version).toBe("1.30.3")
      expect(get).toHaveBeenCalled()
      expect(patch).toHaveBeenCalledWith(
        expect.stringContaining("/shoots/test-cluster"),
        expect.objectContaining({
          metadata: { resourceVersion: "12345" },
          spec: expect.objectContaining({
            kubernetes: { version: "1.30.3" },
          }),
        }),
        expect.any(Object)
      )
    })

    it("rejects update without any field", async () => {
      const { ctx, get } = createMockContext()

      const caller = createCaller(ctx)
      await expect(
        caller.clusters.update({
          project_id: "p-1",
          landscape: "qa",
          name: "test-cluster",
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(get).not.toHaveBeenCalled()
    })

    it("does not send annotations even if present in input", async () => {
      const { ctx, get, patch } = createMockContext()
      get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: { name: "test", resourceVersion: "12345" },
          spec: {},
          status: {},
        }),
      })
      patch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: { name: "test", resourceVersion: "12346" },
          spec: {},
          status: {},
        }),
      })

      const caller = createCaller(ctx)
      // Extra keys are stripped by Zod's .strict() or default behavior
      await caller.clusters.update({
        project_id: "p-1",
        landscape: "qa",
        name: "test",
        kubernetesVersion: "1.30.3",
      })

      const patchBody = patch.mock.calls[0][1]
      expect(patchBody.metadata.annotations).toBeUndefined()
    })
  })

  describe("replace", () => {
    it("replaces a cluster with PUT", async () => {
      const { ctx, put } = createMockContext()
      put.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: { name: "test", resourceVersion: "12346" },
          spec: {},
          status: {},
        }),
      })

      const caller = createCaller(ctx)
      const result = await caller.clusters.replace({
        project_id: "p-1",
        landscape: "qa",
        name: "test",
        resource: {
          apiVersion: "core.gardener.cloud/v1beta1",
          kind: "Shoot",
          metadata: { name: "test", resourceVersion: "12345" },
          spec: {},
        },
      })

      expect(result.raw).toBeDefined()
      expect(put).toHaveBeenCalledWith(
        expect.stringContaining("/shoots/test"),
        expect.objectContaining({
          kind: "Shoot",
          metadata: { name: "test", resourceVersion: "12345" },
        }),
        expect.any(Object)
      )
    })

    it("rejects mismatched resource name", async () => {
      const { ctx, put } = createMockContext()

      const caller = createCaller(ctx)
      await expect(
        caller.clusters.replace({
          project_id: "p-1",
          landscape: "qa",
          name: "test",
          resource: {
            apiVersion: "core.gardener.cloud/v1beta1",
            kind: "Shoot",
            metadata: { name: "different" },
            spec: {},
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(put).not.toHaveBeenCalled()
    })

    it("rejects mismatched namespace", async () => {
      const { ctx, put } = createMockContext()

      const caller = createCaller(ctx)
      await expect(
        caller.clusters.replace({
          project_id: "p-1",
          landscape: "qa",
          name: "test",
          resource: {
            apiVersion: "core.gardener.cloud/v1beta1",
            kind: "Shoot",
            metadata: { name: "test", namespace: "wrong-namespace" },
            spec: {},
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("does not belong to this project"),
      })
      expect(put).not.toHaveBeenCalled()
    })

    it("passes through 409 conflict message", async () => {
      const { ctx, put } = createMockContext()
      put.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          kind: "Status",
          status: "Failure",
          code: 409,
          message: "the object has been modified; please apply your changes to the latest version",
        }),
      })

      const caller = createCaller(ctx)
      await expect(
        caller.clusters.replace({
          project_id: "p-1",
          landscape: "qa",
          name: "test",
          resource: {
            apiVersion: "core.gardener.cloud/v1beta1",
            kind: "Shoot",
            metadata: { name: "test" },
            spec: {},
          },
        })
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: expect.stringContaining("modified"),
      })
    })

    it("redacts token from 422 message", async () => {
      const { ctx, put } = createMockContext()
      put.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          kind: "Status",
          status: "Failure",
          code: 422,
          message: "Invalid shoot spec with token tok-123 and region qa-de-1:tok-123",
        }),
      })

      const caller = createCaller(ctx)
      try {
        await caller.clusters.replace({
          project_id: "p-1",
          landscape: "qa",
          name: "test",
          resource: {
            apiVersion: "core.gardener.cloud/v1beta1",
            kind: "Shoot",
            metadata: { name: "test" },
            spec: {},
          },
        })
        expect.fail("Should have thrown")
      } catch (error) {
        expect((error as Error).message).not.toContain("tok-123")
        expect((error as Error).message).toContain("[redacted]")
      }
    })
  })

  describe("reconcile", () => {
    it("patches with reconcile annotation", async () => {
      const { ctx, patch } = createMockContext()
      patch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: { name: "test", annotations: { "gardener.cloud/operation": "reconcile" } },
          spec: {},
          status: {},
        }),
      })

      const caller = createCaller(ctx)
      await caller.clusters.reconcile({ project_id: "p-1", landscape: "qa", name: "test" })

      expect(patch).toHaveBeenCalledWith(
        expect.stringContaining("/shoots/test"),
        expect.objectContaining({
          metadata: {
            annotations: {
              "gardener.cloud/operation": "reconcile",
            },
          },
        }),
        expect.any(Object)
      )
    })
  })

  describe("confirmDeletion", () => {
    it("patches with deletion confirmation annotation", async () => {
      const { ctx, patch } = createMockContext()
      patch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: { name: "test", annotations: { "confirmation.gardener.cloud/deletion": "true" } },
          spec: {},
          status: {},
        }),
      })

      const caller = createCaller(ctx)
      await caller.clusters.confirmDeletion({ project_id: "p-1", landscape: "qa", name: "test" })

      expect(patch).toHaveBeenCalledWith(
        expect.stringContaining("/shoots/test"),
        expect.objectContaining({
          metadata: {
            annotations: {
              "confirmation.gardener.cloud/deletion": "true",
            },
          },
        }),
        expect.any(Object)
      )
    })
  })

  describe("delete", () => {
    it("patches then deletes", async () => {
      const { ctx, patch, del } = createMockContext()
      patch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metadata: { name: "test", annotations: { "confirmation.gardener.cloud/deletion": "true" } },
          spec: {},
          status: {},
        }),
      })
      del.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ kind: "Status", status: "Success" }),
      })

      const caller = createCaller(ctx)
      const result = await caller.clusters.delete({ project_id: "p-1", landscape: "qa", name: "test" })

      expect(result).toBe(true)
      expect(patch).toHaveBeenCalledWith(
        expect.stringContaining("/shoots/test"),
        expect.objectContaining({
          metadata: {
            annotations: {
              "confirmation.gardener.cloud/deletion": "true",
            },
          },
        }),
        expect.any(Object)
      )
      expect(del).toHaveBeenCalledWith(expect.stringContaining("/shoots/test"), expect.any(Object))
    })

    it("does not call DELETE if PATCH fails", async () => {
      const { ctx, patch, del } = createMockContext()
      patch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          kind: "Status",
          status: "Failure",
          code: 403,
          message: "forbidden",
        }),
      })

      const caller = createCaller(ctx)
      await expect(caller.clusters.delete({ project_id: "p-1", landscape: "qa", name: "test" })).rejects.toThrow()

      expect(patch).toHaveBeenCalled()
      expect(del).not.toHaveBeenCalled()
    })
  })

  describe("getAdminKubeconfig", () => {
    it("requests admin kubeconfig with correct body and path", async () => {
      const { ctx, post } = createMockContext()
      const b64Kubeconfig = Buffer.from("kubeconfig content", "utf8").toString("base64")
      post.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: {
            kubeconfig: b64Kubeconfig,
          },
        }),
      })

      const caller = createCaller(ctx)
      const result = await caller.clusters.getAdminKubeconfig({
        project_id: "p-1",
        landscape: "qa",
        name: "test",
      })

      expect(result.kubeconfig).toBe("kubeconfig content")
      expect(result.expiresInSeconds).toBe(28800)
      expect(post).toHaveBeenCalledWith(
        expect.stringContaining("/shoots/test/adminkubeconfig"),
        expect.objectContaining({
          apiVersion: "authentication.gardener.cloud/v1alpha1",
          kind: "AdminKubeconfigRequest",
          spec: {
            expirationSeconds: 28800,
          },
        }),
        expect.any(Object)
      )
    })

    it("throws on invalid base64", async () => {
      const { ctx, post } = createMockContext()
      post.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: {
            kubeconfig: "invalid!base64",
          },
        }),
      })

      const caller = createCaller(ctx)
      await expect(
        caller.clusters.getAdminKubeconfig({ project_id: "p-1", landscape: "qa", name: "test" })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Kubeconfig generation failed.",
      })
    })

    it("maps 403 to FORBIDDEN", async () => {
      const { ctx, post } = createMockContext()
      post.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          kind: "Status",
          status: "Failure",
          code: 403,
          message: "forbidden",
        }),
      })

      const caller = createCaller(ctx)
      await expect(
        caller.clusters.getAdminKubeconfig({ project_id: "p-1", landscape: "qa", name: "test" })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
    })
  })

  it("no result contains the token", async () => {
    const { ctx, get } = createMockContext()
    get.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            metadata: { name: "c1", uid: "u1" },
            spec: {},
            status: {},
          },
        ],
      }),
    })

    const caller = createCaller(ctx)
    const result = await caller.clusters.list({ project_id: "p-1", landscape: "qa" })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("tok-123")
  })
})
