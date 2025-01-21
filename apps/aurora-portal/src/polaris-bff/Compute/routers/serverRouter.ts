import { z } from "zod"
import { publicProcedure } from "../../trpc"
import type { Server } from "../../../shared/types/models"

export const serverRouter = {
  getServer: publicProcedure.input(z.object({ id: z.number() })).query(({ input }): Server => {
    return { id: input.id, name: "Server 1" }
  }),

  getServers: publicProcedure.query((): Server[] => {
    return [
      { id: 1, name: "Server 1" },
      { id: 2, name: "Server 2" },
      { id: 2, name: "Server 3" },
    ]
  }),
}
