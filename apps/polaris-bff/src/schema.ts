import "reflect-metadata"
import { buildSchema } from "type-graphql"
import { TrackResolver } from "./Compute/resolvers/TrackResolver"

import { GraphQLSchema } from "graphql"

export async function createSchema(): Promise<GraphQLSchema> {
  return buildSchema({
    resolvers: [TrackResolver],
  })
}
