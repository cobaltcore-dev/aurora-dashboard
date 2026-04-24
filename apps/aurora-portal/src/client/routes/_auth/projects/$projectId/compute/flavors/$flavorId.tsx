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
import { EditSpecModal } from "../-components/Flavors/-components/EditSpecModal"
import { ManageAccessModal } from "../-components/Flavors/-components/ManageAccessModal"
import { DeleteFlavorModal } from "../-components/Flavors/-components/DeleteFlavorModal"
import { useModal } from "@/client/utils/useModal"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/flavors/$flavorId")({
  staticData: { section: "compute", service: "flavors", isDetail: true } satisfies RouteInfo,
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId } = params

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []

    const serviceIndex = getServiceIndex(availableServices)

    if (!serviceIndex["flavor"] && !serviceIndex["compute"]) {
      throw redirect({
        to: "/projects/$projectId/compute/overview",
        params: { projectId },
      })
    }
  },
})

function RouteComponent() {
  const { projectId, flavorId } = useParams({
    from: "/_auth/projects/$projectId/compute/flavors/$flavorId",
  })
  const { setPageTitle, trpcClient } = Route.useRouteContext()
  const navigate = useNavigate()
  const { t } = useLingui()

  const {
    data: flavor,
    status,
    error,
    refetch,
  } = trpcReact.compute.getFlavorById.useQuery({
    project_id: projectId,
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
      to: "/projects/$projectId/compute/flavors",
      params: { projectId },
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
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-error font-semibold">
          <Trans>Error loading flavor</Trans>
        </p>
        <p className="text-theme-highest">{error?.message || "Unknown error"}</p>
        <ButtonRow>
          <Button onClick={handleBack} variant="subdued">
            <Trans>Back to Flavors</Trans>
          </Button>
          <Button onClick={handleRetry} variant="primary">
            <Trans>Retry</Trans>
          </Button>
        </ButtonRow>
      </Stack>
    )
  }

  if (!flavor) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-highest">
          <Trans>Flavor not found</Trans>
        </p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Flavors</Trans>
        </Button>
      </Stack>
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
