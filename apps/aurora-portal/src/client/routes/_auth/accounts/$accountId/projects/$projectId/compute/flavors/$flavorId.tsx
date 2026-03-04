import { Breadcrumb, BreadcrumbItem, Stack, Spinner } from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { trpcReact } from "@/client/trpcClient"
import { FlavorDetailsView } from "./-components/FlavorDetailsView"
import { ErrorPage } from "@/client/components/Error/ErrorPage"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import { useEffect } from "react"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/flavors/$flavorId")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId } = params

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []

    const serviceIndex = getServiceIndex(availableServices)

    if (!serviceIndex["flavor"] && !serviceIndex["compute"]) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }
  },
})

function RouteComponent() {
  const { accountId, projectId, flavorId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/flavors/$flavorId",
  })
  const { setPageTitle } = Route.useRouteContext()
  const navigate = useNavigate()
  const { t } = useLingui()
  const { translateError, isRetryableError } = useErrorTranslation()

  const {
    data: flavor,
    status,
    error,
    refetch,
  } = trpcReact.compute.getFlavorById.useQuery({
    projectId,
    flavorId,
  })

  useEffect(() => {
    if (flavor?.name) {
      setPageTitle(flavor.name)
    } else if (status === "error") {
      setPageTitle(t`Error - Flavor Details`)
    } else if (status === "pending") {
      setPageTitle(t`Loading Flavor...`)
    } else {
      setPageTitle(t`Flavor Details`)
    }
  }, [flavor?.name, status, setPageTitle, t])

  const handleBack = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/compute/$",
      params: { accountId, projectId, _splat: "flavors" },
    })
  }

  const handleHome = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/compute/$",
      params: { accountId, projectId, _splat: undefined },
    })
  }

  const handleRetry = () => {
    refetch()
  }

  if (status === "pending") {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Flavor Details...</Trans>
      </Stack>
    )
  }

  if (status === "error") {
    const errorCode = error?.message || "UNKNOWN_ERROR"
    const translatedError = translateError(errorCode)
    const canRetry = isRetryableError(errorCode)

    const getStatusCode = (code: string): number | undefined => {
      if (code.includes("UNAUTHORIZED")) return 401
      if (code.includes("FORBIDDEN")) return 403
      if (code.includes("NOT_FOUND")) return 404
      if (code.includes("SERVER_ERROR")) return 500
      return undefined
    }

    return (
      <ErrorPage
        statusCode={getStatusCode(errorCode)}
        title={t`Error Loading Flavor`}
        message={translatedError}
        onBackClick={handleBack}
        onHomeClick={handleHome}
        reset={canRetry ? handleRetry : undefined}
        showHeader={false}
      />
    )
  }

  if (!flavor) {
    return (
      <ErrorPage
        statusCode={404}
        title={t`Flavor Not Found`}
        message={t`The requested flavor could not be found. It may have been deleted or you may not have access to it.`}
        onBackClick={handleBack}
        onHomeClick={handleHome}
        showHeader={false}
      />
    )
  }

  return (
    <Stack direction="vertical">
      <Breadcrumb>
        <BreadcrumbItem onClick={handleHome} label={t`Overview`} icon="home" />
        <BreadcrumbItem onClick={handleBack} label={t`Flavors`} />
        <BreadcrumbItem active label={flavor.name || flavorId} />
      </Breadcrumb>

      <FlavorDetailsView flavor={flavor} />
    </Stack>
  )
}
