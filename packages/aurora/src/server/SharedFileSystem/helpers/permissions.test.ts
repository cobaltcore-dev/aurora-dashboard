import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { createSharedFileSystemPermissionCheck } from "./permissions"
import type { AuroraPortalContext } from "../../context"
import { SHARED_FILE_SYSTEM_PERMISSIONS } from "@/types/sharedFileSystem"
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

describe("shared file system policy Manila 2024.2 reference defaults", () => {
  it.each(["reader", "admin", "member", "unrelated-role"])("allows project-scoped read actions for %s", (role) => {
    const check = createSharedFileSystemPermissionCheck(policyDir)
    expect(SHARED_FILE_SYSTEM_PERMISSIONS.map((permission) => check(context(role), permission))).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ])
  })
  it("allows project-scoped read actions without requiring a role", () => {
    const ctx = context()
    const check = createSharedFileSystemPermissionCheck(policyDir)
    expect(SHARED_FILE_SYSTEM_PERMISSIONS.map((permission) => check(ctx, permission))).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ])
  })

  it.each([
    { role: "reader", is_admin: false, allowed: false },
    { role: "member", is_admin: false, allowed: false },
    { role: "admin", is_admin: false, allowed: false },
    { role: "member", is_admin: true, allowed: true },
  ])("checks cross-project ownership and admin context: %o", ({ role, is_admin, allowed }) => {
    const engine = loadPolicyEngine("shared-file-system.json", policyDir)
    const policy = engine.policy(
      { ...context(role).openstack!.getToken()!.tokenData, is_admin },
      { defaultParams: { project_id: "other-project" } }
    )
    const allRules = [
      "share:get_all",
      "share:get",
      "share_export_location:index",
      "share_snapshot:get_all_snapshots",
      "share_snapshot:get_snapshot",
      "share_replica:get_all",
      "share_network:detail",
      "share_network:show",
      "security_service:detail",
      "security_service:show",
    ]
    expect(allRules.map((rule) => policy.check(rule))).toEqual(Array(10).fill(allowed))
  })

  it("returns false for all permissions when policy file is missing", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfs-policy-"))
    const check = createSharedFileSystemPermissionCheck(tempDir)
    expect(SHARED_FILE_SYSTEM_PERMISSIONS.map((permission) => check(context("member"), permission))).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ])
    // Clean up
    fs.rmSync(tempDir, { recursive: true })
  })

  it("returns true only for mapped rules in a minimal policy file", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfs-policy-"))
    const policyPath = path.join(tempDir, "shared-file-system.json")
    fs.writeFileSync(policyPath, JSON.stringify({ "share:get_all": "project_id:%(project_id)s" }))
    const check = createSharedFileSystemPermissionCheck(tempDir)
    expect(check(context("member"), "shared-file-system:shares:list")).toBe(true)
    expect(check(context("member"), "shared-file-system:shares:read")).toBe(false)
    // Clean up
    fs.rmSync(tempDir, { recursive: true })
  })

  it("throws UNAUTHORIZED when no token is available", () => {
    const check = createSharedFileSystemPermissionCheck(policyDir)
    const ctxNoToken = { openstack: { getToken: () => null } } as unknown as AuroraPortalContext
    expect(() => check(ctxNoToken, "shared-file-system:shares:list")).toThrow("UNAUTHORIZED")
  })
})
