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
        { id: 1, name: "Jupiter 1" },
        { id: 2, name: "Jupiter 2" },
        { id: 3, name: "Jupiter 3" },
        { id: 4, name: "Jupiter 4" },
        { id: 5, name: "Jupiter 5" },
      ]
    }),
  }),
}
