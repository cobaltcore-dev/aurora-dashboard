import path from "node:path"
import { describe, expect, it } from "vitest"
import { createVolumePermissionCheck } from "./permissions"
import type { AuroraPortalContext } from "../../context"
import { VOLUME_PERMISSIONS } from "@/types/volume"
import { loadPolicyEngine } from "../../policies/policyEngineLoader"

const policyDir = path.resolve(process.cwd(), "../../apps/dashboard/src/policies")
const context = (role?: string) =>
  ({
    openstack: {
      getToken: () => ({
        tokenData: {
          roles: role ? [{ id: "role-id", name: role }] : [],
          project: { id: "project-1", name: "Project", domain: { id: "domain-1", name: "Default" } },
        },
      }),
    },
  }) as unknown as AuroraPortalContext

describe("volume policy Queens reference defaults", () => {
  it.each(["reader", "admin", "member", "unrelated-role"])("allows project-scoped read actions for %s", (role) => {
    const check = createVolumePermissionCheck(policyDir)
    expect(VOLUME_PERMISSIONS.map((permission) => check(context(role), permission))).toEqual([true, true, true, true])
  })
  it("allows project-scoped read actions without requiring a role", () => {
    const ctx = context()
    const check = createVolumePermissionCheck(policyDir)
    expect(VOLUME_PERMISSIONS.map((permission) => check(ctx, permission))).toEqual([true, true, true, true])
  })

  it.each([
    { role: "reader", is_admin: false, is_admin_project: false, allowed: false },
    { role: "member", is_admin: false, is_admin_project: false, allowed: false },
    { role: "admin", is_admin: false, is_admin_project: false, allowed: false },
    { role: "admin", is_admin: false, is_admin_project: true, allowed: true },
    { role: "member", is_admin: true, is_admin_project: false, allowed: true },
  ])("checks cross-project ownership and admin context: %o", ({ role, is_admin, is_admin_project, allowed }) => {
    const engine = loadPolicyEngine("volume.json", policyDir)
    const policy = engine.policy(
      { ...context(role).openstack!.getToken()!.tokenData, is_admin, is_admin_project },
      { defaultParams: { project_id: "other-project" } }
    )
    expect(
      ["volume:get_all", "volume:get", "volume:get_all_snapshots", "volume:get_snapshot"].map((rule) =>
        policy.check(rule)
      )
    ).toEqual([allowed, allowed, allowed, allowed])
  })
})
