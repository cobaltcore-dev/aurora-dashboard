import { Query, Resolver, Ctx } from "type-graphql"
import { Instance } from "../models/Instance"
import { ComputeAPI } from "../api"

interface Context {
  dataSources: {
    computeAPI: ComputeAPI
  }
}

@Resolver()
export class InstanceResolver {
  @Query(() => [Instance])
  async instances(@Ctx() ctx: Context): Promise<Instance[]> {
    return ctx.dataSources.computeAPI.getServers().then((response) => {
      return response.servers.map((server: { id: string; name: string }) => new Instance(server))
    })
  }
}
