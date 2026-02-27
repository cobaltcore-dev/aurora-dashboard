import { createFileRoute, ErrorComponent, redirect, useParams } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ErrorBoundary } from "react-error-boundary"
import { SecurityGroups } from "./-components/SecurityGroups/List"
import { FloatingIps } from "./-components/FloatingIps/List"

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

  return (
    <div>
      <ErrorBoundary fallback={<div className="p-4 text-center">Error loading component</div>}>
        {splat === "securitygroups" ? <SecurityGroups /> : null}
        {splat === "floatingips" ? <FloatingIps /> : null}
      </ErrorBoundary>
    </div>
  )
}
