import { z } from "zod"
// import { router, publicProcedure } from "../../shared/trpc"
import { trpc } from "./trpc"

import type { Entity } from "../../shared/types/models"

export const entityRouter = {
  entities: trpc.router({
    get: trpc.procedure.input(z.object({ id: z.number() })).query(({ input }): Entity => {
      return { id: input.id, name: "Entity 1" }
    }),

    list: trpc.procedure.query((): Entity[] => {
      return [
        { id: 1, name: "Entity 1" },
        { id: 2, name: "Entity 2" },
      ]
    }),
  }),
}
