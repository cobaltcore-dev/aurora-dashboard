import path from "node:path"
import { describe, it, expect, vi } from "vitest"
import { auroraRouter, createCallerFactory } from "../../trpc"
import type { AuroraPortalContext } from "../../context"
import { buildSharedFileSystemPermissionRouter } from "./permissionRouter"
import { buildSharedFileSystemRouters } from "./index"
import type { SharedFileSystemPermissionCheck } from "../helpers/permissions"

const policyDir = path.resolve(process.cwd(), "../../apps/dashboard/src/policies")

function setup() {
  const session = {
    getToken: () => ({
      tokenData: {
        project: { id: "project-1", name: "Project", domain: { id: "domain-1", name: "Default" } },
        roles: [{ id: "role-1", name: "member" }],
      },
    }),
  }
  const ctx = {
    validateSession: () => true,
    rescopeSession: vi.fn(async () => session),
    openstack: session,
  } as unknown as AuroraPortalContext

  return { ctx, session }
}

describe("sharedFileSystem permission router", () => {
  it("returns check result wrapped in array for single permission", async () => {
    const { ctx } = setup()
    const check = vi.fn<SharedFileSystemPermissionCheck>().mockReturnValue(true)
    const router = auroraRouter({ sharedFileSystem: auroraRouter(buildSharedFileSystemPermissionRouter(check)) })
    const caller = createCallerFactory(router)(ctx)

    const result = await caller.sharedFileSystem.canUser({
      project_id: "project-1",
      permission: "shared-file-system:shares:list",
    })

    expect(result).toEqual([true])
    expect(check).toHaveBeenCalledWith(ctx, "shared-file-system:shares:list")
  })

  it("returns results in input order for array permission", async () => {
    const { ctx } = setup()
    const check = vi
      .fn<SharedFileSystemPermissionCheck>()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const router = auroraRouter({ sharedFileSystem: auroraRouter(buildSharedFileSystemPermissionRouter(check)) })
    const caller = createCallerFactory(router)(ctx)

    const result = await caller.sharedFileSystem.canUser({
      project_id: "project-1",
      permission: [
        "shared-file-system:shares:list",
        "shared-file-system:shares:read",
        "shared-file-system:share_networks:list",
      ],
    })

    expect(result).toEqual([true, false, true])
    expect(check).toHaveBeenCalledTimes(3)
    expect(check).toHaveBeenNthCalledWith(1, ctx, "shared-file-system:shares:list")
    expect(check).toHaveBeenNthCalledWith(2, ctx, "shared-file-system:shares:read")
    expect(check).toHaveBeenNthCalledWith(3, ctx, "shared-file-system:share_networks:list")
  })

  it("throws BAD_REQUEST for unknown permission key", async () => {
    const { ctx } = setup()
    const check = vi.fn<SharedFileSystemPermissionCheck>().mockReturnValue(true)
    const router = auroraRouter({ sharedFileSystem: auroraRouter(buildSharedFileSystemPermissionRouter(check)) })
    const caller = createCallerFactory(router)(ctx)

    await expect(
      caller.sharedFileSystem.canUser({
        project_id: "project-1",
        permission: "invalid:key" as never,
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
  })

  it("returns [true] from real policy dir for shares:list with member role", async () => {
    const { ctx } = setup()
    const router = auroraRouter(buildSharedFileSystemRouters(policyDir))
    const caller = createCallerFactory(router)(ctx)

    const result = await caller.sharedFileSystem.canUser({
      project_id: "project-1",
      permission: "shared-file-system:shares:list",
    })

    expect(result).toEqual([true])
  })
})
