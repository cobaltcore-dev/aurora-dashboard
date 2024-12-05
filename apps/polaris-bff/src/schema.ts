import "reflect-metadata"
import { buildSchema } from "type-graphql"
import { TrackResolver } from "./Compute/resolvers/TrackResolver"
import { InstanceResolver } from "./Compute/resolvers/InstanceResolver"
import { TokenResolver } from "./Identity/resolvers/TokenResolver"

import { GraphQLSchema } from "graphql"

export async function createSchema(): Promise<GraphQLSchema> {
  return buildSchema({
    resolvers: [TrackResolver, InstanceResolver, TokenResolver],
  })
}
