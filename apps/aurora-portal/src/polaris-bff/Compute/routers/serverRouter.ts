import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import type { Server } from "../../../shared/types/models"

export const serverRouter = {
  getServer: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }): Server => {
    return { id: input.id, name: "Server 1" }
  }),

  getServers: protectedProcedure.query((): Server[] => {
    return [
      { id: 1, name: "Server 1" },
      { id: 2, name: "Server 2" },
      { id: 2, name: "Server 3" },
    ]
  }),
}
