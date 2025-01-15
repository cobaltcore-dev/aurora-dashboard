import { t } from "./trpc"
import { z } from "zod"

import type { Entity } from "../../shared/types/models"

export const entityRouter = {
  entities: t.router({
    get: t.procedure.input(z.object({ id: z.number() })).query(({ input }): Entity => {
      return { id: input.id, name: "Entity 1" }
    }),

    list: t.procedure.query((): Entity[] => {
      return [
        { id: 1, name: "Entity 1" },
        { id: 2, name: "Entity 2" },
      ]
    }),
  }),
}
