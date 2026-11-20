import { createFileRoute, Outlet, redirect, isRedirect, useNavigate } from "@tanstack/react-router"
import { TabBar, TabBarItem } from "@cloudoperators/juno-ui-components"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { z } from "zod"
import { createContext } from "react"
import { KUBERNETES_LANDSCAPE_KEYS, getAvailableLandscapes, type KubernetesLandscape } from "@/types/kubernetes"

export const LandscapeContext = createContext<{ landscape: KubernetesLandscape }>({ landscape: "qa" })

const KubernetesErrorComponent = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = Route.useParams()

  return (
    <RouteIdLevelDefaultError
      action={
        <button
          className="juno-button juno-button-primary"
          onClick={() =>
            navigate({
              to: "/projects/$projectId/kubernetes",
              params: { projectId },
            })
          }
        >
          {t`Back to Kubernetes`}
        </button>
      }
    />
  )
}

const searchSchema = z.object({
  landscape: z.enum(KUBERNETES_LANDSCAPE_KEYS).optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  status: z.string().optional(),
})

export const Route = createFileRoute("/_auth/projects/$projectId/kubernetes")({
  staticData: {
    section: "kubernetes",
    service: "kubernetes",
    crumb: { text: msg`Kubernetes` },
  } satisfies RouteInfo,
  validateSearch: searchSchema,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient, enabledServices, deniedServices } = context
    const { projectId } = params
    // Honor the appConfig service visibility (allow/deny lists) the nav uses, so a direct URL
    // can't reach a service the operator disabled. Deny always wins, even with no allow list.
    const isEnabled =
      (!enabledServices || enabledServices.includes("kubernetes")) && !deniedServices?.includes("kubernetes")
    if (!isEnabled) {
      throw redirect({ to: "/projects/$projectId", params: { projectId } })
    }
    try {
      const availableServices = await trpcClient?.auth.getAvailableServices.query()
      const availableLandscapes = getAvailableLandscapes(availableServices ?? [])
      if (availableLandscapes.length === 0) {
        throw redirect({ to: "/projects/$projectId", params: { projectId } })
      }
    } catch (err) {
      if (isRedirect(err)) throw err
      // Network/tRPC error — redirect to project page rather than showing the error component
      throw redirect({ to: "/projects/$projectId", params: { projectId } })
    }
  },
  loader: async ({ context }) => {
    const availableServices = await context.trpcClient?.auth.getAvailableServices.query()
    const availableLandscapes = getAvailableLandscapes(availableServices ?? [])
    return { availableLandscapes }
  },
  component: KubernetesLayout,
  errorComponent: KubernetesErrorComponent,
})

function KubernetesLayout() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const { landscape: searchLandscape } = Route.useSearch()
  const { availableLandscapes } = Route.useLoaderData()

  // Default to the first available landscape if not set or invalid
  const landscape: KubernetesLandscape =
    searchLandscape && availableLandscapes.includes(searchLandscape) ? searchLandscape : availableLandscapes[0]

  const handleLandscapeChange = (value: React.ReactNode) => {
    if (typeof value !== "string") return
    void navigate({
      to: "/projects/$projectId/kubernetes",
      params: { projectId },
      search: { landscape: value as KubernetesLandscape },
      replace: true,
    })
  }

  return (
    <LandscapeContext.Provider value={{ landscape }}>
      <div>
        <ContentHeader title={t`Kubernetes`} projectId={projectId} />
        <TabBar ariaLabel={t`Kubernetes landscapes`} activeItem={landscape} onActiveItemChange={handleLandscapeChange}>
          {availableLandscapes.map((l: KubernetesLandscape) => (
            <TabBarItem key={l} label={l.toUpperCase()} value={l} />
          ))}
        </TabBar>
        <div className="mt-4">
          <Outlet />
        </div>
      </div>
    </LandscapeContext.Provider>
  )
}
