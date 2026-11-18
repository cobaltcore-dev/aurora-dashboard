import fs from "node:fs"
import path from "node:path"
import { TRPCError } from "@trpc/server"
import { loadPolicyEngine } from "../../policies/policyEngineLoader"
import type { AuroraPortalContext } from "../../context"
import type { VolumePermission } from "@/types/volume"

const rules: Record<VolumePermission, string> = {
  "volume:volumes:list": "volume:get_all",
  "volume:volumes:read": "volume:get",
  "volume:snapshots:list": "volume:get_all_snapshots",
  "volume:snapshots:read": "volume:get_snapshot",
}

/** Load on demand: upgrading Aurora must not break consumers without Cinder policy files. */
export function createVolumePermissionCheck(policyDir: string) {
  let engine: ReturnType<typeof loadPolicyEngine> | undefined
  return (ctx: AuroraPortalContext, permission: VolumePermission): boolean => {
    if (!engine) {
      // No permissive fallback to an unrelated storage policy. Missing config disables this scope.
      if (!fs.existsSync(path.join(policyDir, "volume.json"))) return false
      engine = loadPolicyEngine("volume.json", policyDir)
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
export type VolumePermissionCheck = ReturnType<typeof createVolumePermissionCheck>
