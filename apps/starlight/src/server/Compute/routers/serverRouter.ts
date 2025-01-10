import { z } from "zod"
import { router, publicProcedure } from "../../../shared/trpc"
import type { Server } from "../../../shared/types/models"

export const serverRouter = {
  servers: router({
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }): Server => {
      return { id: input.id, name: "Server 1" }
    }),

    list: publicProcedure.query((): Server[] => {
      return [
        { id: 1, name: "Server 1" },
        { id: 2, name: "Server 2" },
      ]
    }),
  }),
}
