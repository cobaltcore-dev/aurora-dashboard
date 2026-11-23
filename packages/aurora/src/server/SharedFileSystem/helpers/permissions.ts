import fs from "node:fs"
import path from "node:path"
import { TRPCError } from "@trpc/server"
import { loadPolicyEngine } from "../../policies/policyEngineLoader"
import type { AuroraPortalContext } from "../../context"
import type { SharedFileSystemPermission } from "@/types/sharedFileSystem"

const POLICY_FILE = "shared-file-system.json"

const rules: Record<SharedFileSystemPermission, string> = {
  "shared-file-system:shares:list": "share:get_all",
  "shared-file-system:shares:read": "share:get",
  "shared-file-system:export_locations:list": "share_export_location:index",
  "shared-file-system:snapshots:list": "share_snapshot:get_all_snapshots",
  "shared-file-system:snapshots:read": "share_snapshot:get_snapshot",
  "shared-file-system:replicas:list": "share_replica:get_all",
  "shared-file-system:share_networks:list": "share_network:detail",
  "shared-file-system:share_networks:read": "share_network:show",
  "shared-file-system:security_services:list": "security_service:detail",
  "shared-file-system:security_services:read": "security_service:show",
}

/** Load on demand: upgrading Aurora must not break consumers without Manila policy files. */
export function createSharedFileSystemPermissionCheck(policyDir: string) {
  let engine: ReturnType<typeof loadPolicyEngine> | undefined
  return (ctx: AuroraPortalContext, permission: SharedFileSystemPermission): boolean => {
    if (!engine) {
      // No permissive fallback to an unrelated storage policy. Missing config disables this scope.
      if (!fs.existsSync(path.join(policyDir, POLICY_FILE))) return false
      engine = loadPolicyEngine(POLICY_FILE, policyDir)
    }
    const token = ctx.openstack?.getToken()
    if (!token) throw new TRPCError({ code: "UNAUTHORIZED" })
    try {
      return engine
        .policy(token.tokenData, {
          defaultParams: { project_id: token.tokenData.project?.id },
        })
        .check(rules[permission])
    } catch (error) {
      if (error instanceof Error && /not found and no _default rule available/.test(error.message)) return false
      throw error
    }
  }
}
export type SharedFileSystemPermissionCheck = ReturnType<typeof createSharedFileSystemPermissionCheck>
