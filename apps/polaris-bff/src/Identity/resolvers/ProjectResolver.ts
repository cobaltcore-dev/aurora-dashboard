import { Query, Resolver, Ctx } from "type-graphql"
import { Context } from "../../types"
import { Project } from "../models/Project"
import { OpenstackIdentityAPI } from "../apis/openstack"

interface IdentityContext extends Context {
  dataSources: {
    openstackIdentityAPI: OpenstackIdentityAPI
  }
}

type ProjectResponse = Project & { domain_id: string }

@Resolver()
export class ProjectResolver {
  @Query(() => [Project])
  async listAuthProjects(@Ctx() ctx: IdentityContext): Promise<Project[]> {
    console.log("=========================")
    console.log(ctx.authToken)
    if (!ctx.authToken) {
      throw new Error("Unauthorized")
    }
    return ctx.dataSources.openstackIdentityAPI.listAuthProjects(ctx.authToken).then((response) => {
      return response.projects.map((project: ProjectResponse) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        domain: { id: project.domain_id },
        enabled: project.enabled,
      }))
    })
  }
}
