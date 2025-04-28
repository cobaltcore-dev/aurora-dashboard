import { z } from "zod"
import { auroraRouter, publicProcedure, protectedProcedure } from "./trpc"
import type { Entity } from "../types/models"

export const entityRouter = {
  entities: auroraRouter({
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }: { input: { id: number } }): Entity => {
      return { id: input.id, name: "Mars 1" }
    }),

    list: protectedProcedure.query(async ({ ctx }): Promise<Entity[]> => {
      const token = ctx.openstack?.getToken()

      return [
        { id: 1, name: "Venus 1" },
        { id: 2, name: "Venus 2" },
        { id: 3, name: "Venus 3" },
        { id: 4, name: "Venus 4" },
        { id: 5, name: "Venus 5" },
      ]
    }),
  }),
}
