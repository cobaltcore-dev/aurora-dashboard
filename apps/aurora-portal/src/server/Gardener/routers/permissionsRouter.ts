import { protectedProcedure } from "../../trpc"
import { getGardenerClient } from "../gardenerClient"
import { SelfSubjectAccessReviewListSchema } from "../types/permissionsApiSchema"
import { z } from "zod"
import { TRPCError } from "@trpc/server"

export const permissionsRouter = {
  getPermissions: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    const openstackSession = await ctx.rescopeSession({ projectId: input.projectId })

    const client = getGardenerClient(openstackSession)
    if (!client) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Could not get Gardener client. Please check service catalog.",
      })
    }

    const namespace = `garden-${input.projectId}`
    const permissions = ["list", "get", "create", "update", "delete"] as const

    // Kubernetes SelfSubjectAccessReview API only supports checking one permission at a time.
    // Each request can only check a single verb against a single resource
    const requests = permissions.map((permission) =>
      client!
        .post("apis/authorization.k8s.io/v1/selfsubjectaccessreviews", {
          kind: "SelfSubjectAccessReview" as const,
          apiVersion: "authorization.k8s.io/v1",
          spec: {
            resourceAttributes: {
              namespace,
              verb: permission,
              resource: "shoots",
              group: "core.gardener.cloud",
            },
          },
        })
        .then((res) => res.json())
        .catch(async (err) => {
          let errorDetails

          try {
            const errorBody = await err.response.json()
            errorDetails = errorBody.error || errorBody.message || err.message
          } catch {
            // If JSON parsing fails, use the original error message
            errorDetails = err.message
          }

          throw new Error(`Error fetching permissions: ${errorDetails}`)
        })
    )

    const responses = await Promise.all(requests)
    const parsedResponses = SelfSubjectAccessReviewListSchema.safeParse(responses)

    if (!parsedResponses.success) {
      throw new Error(`Failed to parse permissions responses: ${parsedResponses.error.message}`)
    }

    const results: Record<string, boolean> = {}
    permissions.forEach((permission, index) => {
      const response = parsedResponses.data[index]
      results[permission] = response.status?.allowed ?? false
    })

    return results
  }),
}
