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
import type { RouteInfo } from "@/client/routes/routeInfo"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { trpcReact } from "@/client/trpcClient"
import { FlavorDetailsView } from "./-components/FlavorDetailsView"
import { StatusError } from "@/client/components/Error/StatusError"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import { EditSpecModal } from "../-components/Flavors/-components/EditSpecModal"
import { ManageAccessModal } from "../-components/Flavors/-components/ManageAccessModal"
import { DeleteFlavorModal } from "../-components/Flavors/-components/DeleteFlavorModal"
import { useModal } from "@/client/utils/useModal"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/flavors/$flavorId")({
  staticData: { section: "compute", service: "flavors", isDetail: true } satisfies RouteInfo,
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

  const { data: permissionsData } = trpcReact.compute.canUser.useQuery([
    "flavors:delete",
    "flavors:list_projects",
    "flavor_specs:create",
    "flavor_specs:delete",
  ])

  const canDeleteFlavor = permissionsData?.[0] ?? false
  const canManageAccess = permissionsData?.[1] ?? false
  const canManageSpecs = (permissionsData?.[2] ?? false) || (permissionsData?.[3] ?? false)

  const [specModalOpen, toggleSpecModal] = useModal()
  const [accessModalOpen, toggleAccessModal] = useModal()
  const [deleteModalOpen, toggleDeleteModal] = useModal()

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
      to: "/accounts/$accountId/projects/$projectId/compute/flavors",
      params: { accountId, projectId },
    })
  }

  const handleHome = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/compute/overview",
      params: { accountId, projectId },
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
      <StatusError
        message={translatedError}
        statusCode={getStatusCode(errorCode)}
        title={t`Error Loading Flavor`}
        onBackClick={handleBack}
        onHomeClick={handleHome}
        reset={canRetry ? handleRetry : undefined}
      />
    )
  }

  if (!flavor) {
    return (
      <StatusError
        message={t`The requested flavor could not be found. It may have been deleted or you may not have access to it.`}
        statusCode={404}
        title={t`Flavor Not Found`}
        onBackClick={handleBack}
        onHomeClick={handleHome}
      />
    )
  }

  const hasMoreActions = canManageAccess || canDeleteFlavor

  return (
    <>
      <Stack direction="vertical">
        <ButtonRow>
          {hasMoreActions && (
            <PopupMenu>
              <PopupMenuToggle as="div">
                <Button icon="moreVert">
                  <Trans>More Actions</Trans>
                </Button>
              </PopupMenuToggle>
              <PopupMenuOptions>
                {canManageAccess && <PopupMenuItem label={t`Manage Access`} onClick={toggleAccessModal} />}
                {canDeleteFlavor && <PopupMenuItem label={t`Delete Flavor`} onClick={toggleDeleteModal} />}
              </PopupMenuOptions>
            </PopupMenu>
          )}
          {canManageSpecs && (
            <Button onClick={toggleSpecModal} variant="primary">
              <Trans>Metadata</Trans>
            </Button>
          )}
        </ButtonRow>
        <FlavorDetailsView flavor={flavor} />
      </Stack>

      {trpcClient && (
        <>
          {specModalOpen && (
            <EditSpecModal
              client={trpcClient}
              isOpen={specModalOpen}
              onClose={toggleSpecModal}
              project={projectId}
              flavor={flavor}
            />
          )}

          {accessModalOpen && (
            <ManageAccessModal
              client={trpcClient}
              isOpen={accessModalOpen}
              onClose={toggleAccessModal}
              project={projectId}
              flavor={flavor}
            />
          )}

          {deleteModalOpen && (
            <DeleteFlavorModal
              client={trpcClient}
              isOpen={deleteModalOpen}
              onClose={toggleDeleteModal}
              project={projectId}
              flavor={flavor}
              onSuccess={handleBack}
            />
          )}
        </>
      )}
    </>
  )
}
