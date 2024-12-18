import { NonEmptyArray } from "type-graphql"
import { ServerResolver } from "./Compute/resolvers/ServerResolver"
import { TokenResolver } from "./Identity/resolvers/TokenResolver"

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const resolvers: NonEmptyArray<Function> = [TokenResolver, ServerResolver]
