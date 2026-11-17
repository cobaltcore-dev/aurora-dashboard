import path from "node:path"
import { describe, expect, it } from "vitest"
import { createVolumePermissionCheck } from "./permissions"
import type { AuroraPortalContext } from "../../context"
import { VOLUME_PERMISSIONS } from "@/types/volume"

const policyDir = path.resolve(process.cwd(), "../../apps/dashboard/src/policies")
const context = (role: string) =>
  ({
    openstack: {
      getToken: () => ({
        tokenData: {
          roles: [{ id: "role-id", name: role }],
          project: { id: "project-1", name: "Project", domain: { id: "domain-1", name: "Default" } },
        },
      }),
    },
  }) as unknown as AuroraPortalContext

describe("volume policy deployment contract", () => {
  it.each(["reader", "admin"])("allows the supplied read actions for %s", (role) => {
    const check = createVolumePermissionCheck(policyDir)
    expect(VOLUME_PERMISSIONS.map((permission) => check(context(role), permission))).toEqual([true, true, true, true])
  })
  it("does not infer read access from an arbitrary role name", () => {
    const check = createVolumePermissionCheck(policyDir)
    expect(check(context("unrelated-role"), "volume:volumes:list")).toBe(false)
  })
})
