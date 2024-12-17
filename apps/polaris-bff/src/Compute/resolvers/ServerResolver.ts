import { Query, Resolver, Ctx } from "type-graphql"
import { Context } from "../../types"
import { Server } from "../models/Server"
import { OpenstackComputeAPI } from "../apis/openstack"

interface ComputeContext extends Context {
  dataSources: {
    openstackComputeAPI: OpenstackComputeAPI
  }
}

@Resolver()
export class ServerResolver {
  @Query(() => [Server])
  async listServers(@Ctx() ctx: ComputeContext): Promise<Server[]> {
    return ctx.dataSources.openstackComputeAPI.getServers().then((response) => {
      return response.servers //.map((server) => server as Server)
    })
  }
}
