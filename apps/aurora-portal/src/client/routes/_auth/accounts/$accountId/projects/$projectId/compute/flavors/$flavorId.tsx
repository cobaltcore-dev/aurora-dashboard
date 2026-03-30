import {
  Button,
  ButtonRow,
  Stack,
  Spinner,
  PopupMenu,
  PopupMenuToggle,
  PopupMenuOptions,
  PopupMenuItem,
} from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { trpcReact } from "@/client/trpcClient"
import { FlavorDetailsView } from "./-components/FlavorDetailsView"
import { ErrorPage } from "@/client/components/Error/ErrorPage"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import { EditSpecModal } from "../-components/Flavors/-components/EditSpecModal"
import { ManageAccessModal } from "../-components/Flavors/-components/ManageAccessModal"
import { DeleteFlavorModal } from "../-components/Flavors/-components/DeleteFlavorModal"
import { useState } from "react"

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
  const { setPageTitle, trpcClient } = Route.useRouteContext()
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

  const { data: permissionsData } = trpcReact.compute.canUserBulk.useQuery([
    "flavors:delete",
    "flavors:list_projects",
  ])

  const canDeleteFlavor = permissionsData?.[0] ?? false
  const canManageAccess = permissionsData?.[1] ?? false

  const [specModalOpen, setSpecModalOpen] = useState(false)
  const [accessModalOpen, setAccessModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  if (flavor?.name) {
    setPageTitle(flavor.name)
  } else if (status === "error") {
    setPageTitle(t`Error - Flavor Details`)
  } else if (status === "pending") {
    setPageTitle(t`Loading Flavor...`)
  } else {
    setPageTitle(t`Flavor Details`)
  }

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
    <>
      <Stack direction="vertical">
        <ButtonRow>
          <PopupMenu>
            <PopupMenuToggle>
              <Button icon="moreVert">
                <Trans>More Actions</Trans>
              </Button>
            </PopupMenuToggle>
            <PopupMenuOptions>
              {canManageAccess && (
                <PopupMenuItem label={t`Manage Access`} onClick={() => setAccessModalOpen(true)} />
              )}
              {canDeleteFlavor && (
                <PopupMenuItem label={t`Delete Flavor`} onClick={() => setDeleteModalOpen(true)} />
              )}
            </PopupMenuOptions>
          </PopupMenu>
          <Button onClick={() => setSpecModalOpen(true)} variant="primary">
            <Trans>Metadata</Trans>
          </Button>
        </ButtonRow>
        <FlavorDetailsView flavor={flavor} />
      </Stack>

      {trpcClient && (
        <>
          <EditSpecModal
            client={trpcClient}
            isOpen={specModalOpen}
            onClose={() => setSpecModalOpen(false)}
            project={projectId}
            flavor={flavor}
          />

          <ManageAccessModal
            client={trpcClient}
            isOpen={accessModalOpen}
            onClose={() => setAccessModalOpen(false)}
            project={projectId}
            flavor={flavor}
          />

          <DeleteFlavorModal
            client={trpcClient}
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            project={projectId}
            flavor={flavor}
            onSuccess={handleBack}
          />
        </>
      )}
    </>
  )
}
