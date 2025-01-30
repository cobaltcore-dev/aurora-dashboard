import { RouterLike } from "@trpc/react-query/dist/shared"
import { AnyRouter } from "@trpc/server"

export type AuroraReactQueryRouterLike<TAuroraRouter extends AnyRouter> = RouterLike<TAuroraRouter>
