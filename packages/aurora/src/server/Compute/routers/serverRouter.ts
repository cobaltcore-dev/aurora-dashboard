import { z } from "zod"
import { projectScopedProcedure, projectScopedInputSchema } from "../../trpc"
import { Server } from "../types/server"
import { fetchAllServers } from "../helpers/serverHelpers"
import { filterServers, sortServers } from "../helpers/filterServers"

export const serversInputSchema = projectScopedInputSchema.extend({
  /** Substring match over name and id. */
  name: z.string().optional(),
  /** "key:dir", e.g. "name:asc". */
  sort: z.string().optional(),
  power_state: z.string().optional(),
  availability_zone: z.string().optional(),
  flavor: z.string().optional(),
  image: z.string().optional(),
  key_name: z.string().optional(),
  locked: z.string().optional(),
})

export const serverRouter = {
  getServersByProjectId: projectScopedProcedure
    .input(serversInputSchema)
    .query(async ({ input, ctx }): Promise<Server[] | undefined> => {
      try {
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")

        if (!compute) {
          console.error("Compute service not available")
          return undefined
        }

        // One Nova call (microversion header + servers_links pagination + address
        // normalization); the full list is reused by the detail view.
        const servers = await fetchAllServers(compute)
        if (!servers) return undefined

        // Filter and sort BFF-side, mirroring the Glance images router.
        const filtered = filterServers(servers, {
          name: input.name,
          power_state: input.power_state,
          availability_zone: input.availability_zone,
          flavor: input.flavor,
          image: input.image,
          key_name: input.key_name,
          locked: input.locked,
        })
        return sortServers(filtered, input.sort)
      } catch (error) {
        console.error("Error fetching servers:", error)
        return undefined
      }
    }),
}
