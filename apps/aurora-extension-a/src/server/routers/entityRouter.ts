import { z } from "zod"
import { trpc } from "./trpc"
import type { Entity } from "../types/models"

export const entityRouter = {
  entities: trpc.router({
    get: trpc.procedure.input(z.object({ id: z.number() })).query(({ input }): Entity => {
      return { id: input.id, name: "Mars 1" }
    }),

    list: trpc.procedure.query((): Entity[] => {
      return [
        { id: 1, name: "Mars 1" },
        { id: 2, name: "Mars 2" },
      ]
    }),
  }),
}
