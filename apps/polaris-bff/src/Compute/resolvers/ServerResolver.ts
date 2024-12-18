import { Query, Resolver, Ctx } from "type-graphql"
import { Context } from "../../types/context"
import { Server } from "../models/Server"
import { OpenstackComputeAPI } from "../apis/openstack"

interface ComputeContext extends Context {
  dataSources: {
    openstack: {
      compute: OpenstackComputeAPI
    }
  }
}

@Resolver()
export class ServerResolver {
  @Query(() => [Server])
  async servers(@Ctx() ctx: ComputeContext): Promise<Server[]> {
    return ctx.dataSources.openstack.compute.getServers().then((response) => response.servers)
  }
}
