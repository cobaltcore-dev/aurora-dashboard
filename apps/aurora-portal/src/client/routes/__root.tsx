import * as React from "react"
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
// NavigationLayout.tsx
import { MainNavigation } from "../Shell/Navigation/MainNavigation"
import { NavigationItem } from "../Shell/Navigation/types"
import { Domain } from "../../server/Authentication/types/models"
import { Project } from "../../server/Project/types/models"
import { TrpcClient } from "../trpcClient"

interface NavigationLayoutProps {
  mainNavItems?: NavigationItem[]
  children?: React.ReactNode
}
interface ProjectLoaderData {
  domain: Domain
  project: Project
  isLoading: boolean
}

// Rescope Loader
export async function rescopeTokenLoader(
  domain: string,
  project: string,
  trpcClient: TrpcClient
): Promise<ProjectLoaderData> {
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
interface MyRouterContext {
  domain?: Domain
  project?: Project
  trpcClient?: TrpcClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: () => {
    return {
      domain: { id: "default", name: "Default Domain" },
      project: {
        id: "project-1",
        name: "Project Alpha",
        description: "Test project",
        domain_id: "default",
        enabled: true,
        links: { self: "https://example.com/project-1" },
      },
    }
  },
  loader: ({ context }) => {
    return {
      domain: context.domain,
      project: context.project,
    }
  },
  component: AuroraLayout,
})

function AuroraLayout({ mainNavItems = [], children }: NavigationLayoutProps) {
  // Default navigation items
  const defaultItems: NavigationItem[] = [{ route: "/about", label: "About" }]
  const { domain, project } = Route.useLoaderData()
  const items = mainNavItems.length > 0 ? mainNavItems : defaultItems

  return (
    <div className="flex flex-col w-full bg-theme-background-lvl-1">
      {/* Main Navigation with minimal height */}
      <div className="px-2 py-1">
        {/* Reduced padding */}
        <MainNavigation domain={domain} project={project} items={items} />
      </div>

      {/* Sub-Navigation with similar reduced height */}
      <div className="w-full flex">{/* Even smaller spacing */}</div>

      <div className="py-4 pl-4 bg-theme-global-bg h-full">{children || <Outlet />}</div>
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  )
}
