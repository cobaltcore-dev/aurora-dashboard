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
        { id: -1, name: JSON.stringify(token?.tokenData, null, 2) },
        { id: 0, name: JSON.stringify(token?.authToken, null, 2) },
        { id: 1, name: "Mars 1" },
        { id: 2, name: "Mars 2" },
        { id: 2, name: "Mars 3" },
        { id: 2, name: "Mars 4" },
        { id: 2, name: "Mars 5" },
      ]
    }),
  }),
}
