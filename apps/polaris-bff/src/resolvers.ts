import { NonEmptyArray } from "type-graphql"
import { InstanceResolver } from "./Compute/resolvers/InstanceResolver"
import { TokenResolver } from "./Identity/resolvers/TokenResolver"

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export default [TokenResolver, InstanceResolver] as NonEmptyArray<Function>
