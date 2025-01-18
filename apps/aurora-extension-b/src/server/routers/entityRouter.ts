import { z } from "zod"
import { trpc } from "./trpc"

export interface Entity {
  id: number
  name: string
}

export const entityRouter = {
  entities: trpc.router({
    get: trpc.procedure.input(z.object({ id: z.number() })).query(({ input }): Entity => {
      return { id: input.id, name: "Jupiter1" }
    }),

    list: trpc.procedure.query((): Entity[] => {
      return [
        { id: 1, name: "Jupiter1" },
        { id: 2, name: "Jupiter2" },
      ]
    }),
  }),
}
