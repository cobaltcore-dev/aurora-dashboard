import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "../../trpc"
import { listSecurityGroupsInputSchema, securityGroupsResponseSchema, SecurityGroup } from "../types/securityGroup"

export const securityGroupRouter = {
  list: protectedProcedure
    .input(listSecurityGroupsInputSchema)
    .query(async ({ input, ctx }): Promise<SecurityGroup[]> => {
      const openstackSession = ctx.openstack
      const network = openstackSession?.service("network")

      if (!network) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Network service is not available",
        })
      }

      const queryParams = new URLSearchParams()

      if (input.limit !== undefined) {
        queryParams.append("limit", input.limit.toString())
      }
      if (input.marker) {
        queryParams.append("marker", input.marker)
      }
      if (input.page_reverse !== undefined) {
        queryParams.append("page_reverse", input.page_reverse ? "true" : "false")
      }
      if (input.sort_key) {
        queryParams.append("sort_key", input.sort_key)
      }
      if (input.sort_dir) {
        queryParams.append("sort_dir", input.sort_dir)
      }
      if (input.name) {
        queryParams.append("name", input.name)
      }
      if (input.description) {
        queryParams.append("description", input.description)
      }
      if (input.project_id) {
        queryParams.append("project_id", input.project_id)
      }
      if (input.tenant_id) {
        queryParams.append("tenant_id", input.tenant_id)
      }
      if (input.shared !== undefined) {
        queryParams.append("shared", input.shared ? "true" : "false")
      }
      if (input.tags) {
        queryParams.append("tags", input.tags)
      }
      if (input.tags_any) {
        queryParams.append("tags-any", input.tags_any)
      }
      if (input.not_tags) {
        queryParams.append("not-tags", input.not_tags)
      }
      if (input.not_tags_any) {
        queryParams.append("not-tags-any", input.not_tags_any)
      }

      const queryString = queryParams.toString()
      const url = queryString ? `v2.0/security-groups?${queryString}` : "v2.0/security-groups"

      try {
        const response = await network.get(url)
        const data = await response.json()

        const parsed = securityGroupsResponseSchema.safeParse(data)

        if (!parsed.success) {
          // Log detailed parsing errors for observability
          console.error("Zod Parsing Error in securityGroupRouter.list:", parsed.error.format())

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to parse security groups response from OpenStack",
          })
        }

        return parsed.data.security_groups
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        console.error("Error fetching security groups from OpenStack:", error)

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch security groups from OpenStack",
        })
      }
    }),
}
