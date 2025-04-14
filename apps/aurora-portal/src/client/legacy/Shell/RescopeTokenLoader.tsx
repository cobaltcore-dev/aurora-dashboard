import { Params, ShouldRevalidateFunctionArgs } from "react-router-dom"
import { Domain } from "domain"
import { Project } from "../../../server/Project/types/models"
import { trpcClient } from "../../trpcClient"

interface ProjectLoaderData {
  domain: Domain
  project: Project
  isLoading: boolean
}

// Rescope Loader
export async function rescopeTokenLoader({ params }: { params: Params<string> }): Promise<ProjectLoaderData> {
  const { project, domain } = params
  let data = null
  try {
    if (project) {
      data = await trpcClient.auth.setCurrentScope.mutate({
        type: "project",
        projectId: project || "",
      })
    } else if (domain) {
      data = await trpcClient.auth.setCurrentScope.mutate({
        type: "domain",
        domainId: domain || "",
      })
    } else {
      data = await trpcClient.auth.setCurrentScope.mutate({
        type: "unscoped",
        value: "",
      })
    }

    return {
      domain: data.domain as Domain,
      project: data.project as Project,
      isLoading: false,
    }
  } catch (error: Error | unknown) {
    throw new Response(JSON.stringify({ message: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      statusText: "Project Rescope Error",
    })
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shouldRevalidateRescope(arg: ShouldRevalidateFunctionArgs) {
  return true // false
}
