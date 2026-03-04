import { createFileRoute, ErrorComponent, redirect, useParams } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ErrorBoundary } from "react-error-boundary"
import { SecurityGroups } from "./-components/SecurityGroups/List"
import { FloatingIps } from "./-components/FloatingIps/List"
import { Trans, useLingui } from "@lingui/react/macro"
import { useEffect } from "react"

const checkNetworkServiceAvailability = (
  availableServices: { type: string; name: string }[],
  params: { accountId: string }
) => {
  const { accountId } = params
  const serviceIndex = getServiceIndex(availableServices)

  if (!serviceIndex["network"]) {
    throw redirect({
      to: "/accounts/$accountId/projects",
      params: { accountId },
    })
  }
}

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/$")({
  component: RouteComponent,
  errorComponent: ({ error }) => {
    if (error instanceof Error) {
      return <div>{error.message}</div>
    }
    return <ErrorComponent error={error} />
  },
  loader: async ({ context }) => {
    const { trpcClient } = context
    const availableServices = await trpcClient?.auth.getAvailableServices.query()

    return {
      client: trpcClient,
      availableServices,
    }
  },
  beforeLoad: async ({ context, params }) => {
    const availableServices = await context.trpcClient?.auth.getAvailableServices.query()
    checkNetworkServiceAvailability(availableServices!, params)
  },
})

function RouteComponent() {
  const { splat } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/network/$",
    select: (params) => ({ splat: params._splat }),
  })

  const { setPageTitle } = Route.useRouteContext()
  const { t } = useLingui()

  useEffect(() => {
    switch (splat) {
      case "securitygroups":
        setPageTitle(t`Security Groups`)
        break
      case "floatingips":
        setPageTitle(t`Floating IPs`)
        break
      default:
        setPageTitle(t`Network Overview`)
    }
  }, [splat, setPageTitle, t])

  return (
    <div>
      <ErrorBoundary
        fallback={
          <div className="p-4 text-center">
            <Trans>Error loading component</Trans>
          </div>
        }
      >
        {(() => {
          switch (splat) {
            case "securitygroups":
              return <SecurityGroups />

            case "floatingips":
              return <FloatingIps />

            default:
              return (
                <div className="p-4 text-center">
                  <Trans>Network Overview</Trans>
                </div>
              )
          }
        })()}
      </ErrorBoundary>
    </div>
  )
}
