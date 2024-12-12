import { Query, Resolver, Ctx } from "type-graphql"
import { Context } from "../../types"
import { Instance } from "../models/Instance"
import { OpenstackComputeAPI } from "../apis/openstack"

interface ComputeContext extends Context {
  dataSources: {
    osComputeAPI: OpenstackComputeAPI
  }
}

@Resolver()
export class InstanceResolver {
  @Query(() => [Instance])
  async instances(@Ctx() ctx: ComputeContext): Promise<Instance[]> {
    return ctx.dataSources.osComputeAPI.getServers().then((response) => {
      return response.servers.map((server: { id: string; name: string }) => new Instance(server))
    })
  }
}
