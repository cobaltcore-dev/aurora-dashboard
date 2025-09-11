import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "@/server/context"
import { protectedProcedure } from "../../trpc"
import { loadPolicyEngine } from "@/server/policyEngineLoader"

const policyEngine = loadPolicyEngine("compute.yaml")

const getPolicy = (ctx: AuroraPortalContext) => {
  const openstaSession = ctx.openstack
  const token = openstaSession?.getToken()
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
  }
  return policyEngine.policy(token.tokenData, {
    debug: false,
    defaultParams: { project_id: token.tokenData.project?.id },
  })
}

export const permissionRouter = {
  canListServers: protectedProcedure.query(async ({ ctx }) => {
    const policy = getPolicy(ctx)
    return policy.check("os_compute_api:servers:index")
  }),
}
