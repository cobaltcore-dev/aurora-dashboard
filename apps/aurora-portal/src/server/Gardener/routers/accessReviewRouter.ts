import { publicProcedure } from "../../trpc"
import { client } from "../client"
import { SelfSubjectAccessReviewListSchema } from "../types/accessReviewApiSchema"

export const accessReviewRouter = {
  getAccessReviewInformation: publicProcedure.query(async () => {
    const permissions = ["list", "get", "create", "update", "delete"] as const

    // Kubernetes SelfSubjectAccessReview API only supports checking one permission at a time.
    // Each request can only check a single verb against a single resource
    const requests = permissions.map((permission) =>
      client
        .post("apis/authorization.k8s.io/v1/selfsubjectaccessreviews", {
          kind: "SelfSubjectAccessReview" as const,
          apiVersion: "authorization.k8s.io/v1",
          metadata: { creationTimestamp: null },
          spec: {
            resourceAttributes: {
              namespace: `garden-${process.env.GARDENER_PROJECT}`,
              verb: permission,
              resource: "shoots",
              group: "core.gardener.cloud",
            },
          },
        })
        .catch(async (err) => {
          const errorBody = await err.response.json()
          const errorDetails = errorBody.error || errorBody.message || err.message
          throw new Error(`Error fetching access review information: ${errorDetails}`)
        })
    )

    const responses = await Promise.all(requests)
    const parsedResponses = SelfSubjectAccessReviewListSchema.safeParse(responses)

    if (!parsedResponses.success) {
      throw new Error(`Failed to parse access review responses: ${parsedResponses.error.message}`)
    }

    const results: Record<string, boolean> = {}
    permissions.forEach((permission, index) => {
      const response = parsedResponses.data[index]
      results[permission] = response.status?.allowed ?? false
    })

    return results
  }),
}
