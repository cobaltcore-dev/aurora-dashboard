import React, { use, Suspense, useState, startTransition } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import {
  Modal,
  Message,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
  Spinner,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"

interface ManageAccessProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  flavor: Flavor | null
}

interface FlavorAccess {
  flavor_id: string
  tenant_id: string
}

const createPermissionsPromise = (client: TrpcClient) => {
  return Promise.all([
    client.compute.canUser.query("flavors:add_project"),
    client.compute.canUser.query("flavors:remove_project"),
  ]).then(([canAdd, canRemove]) => ({ canAdd, canRemove }))
}

const createFlavorAccessPromise = (client: TrpcClient, project: string, flavorId: string) => {
  return client.compute.getFlavorAccess.query({
    projectId: project,
    flavorId: flavorId,
  })
}

function AccessLoading() {
  return (
    <DataGridRow>
      <DataGridCell colSpan={2}>
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      </DataGridCell>
    </DataGridRow>
  )
}

function AccessContent({
  permissionsPromise,
  flavorAccessPromise,
  client,
  project,
  flavor,
  onAccessUpdate,
  setMessage,
}: {
  permissionsPromise: Promise<{ canAdd: boolean; canRemove: boolean }>
  flavorAccessPromise: Promise<FlavorAccess[]>
  client: TrpcClient
  project: string
  flavor: Flavor
  onAccessUpdate: (access: FlavorAccess[]) => void
  setMessage: (msg: { text: string; type: "error" | "success" } | null) => void
}) {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const permissions = use(permissionsPromise)
  const initialFlavorAccess = use(flavorAccessPromise)

  const [flavorAccess, setFlavorAccess] = useState(initialFlavorAccess)

  const isPublicFlavor = flavor["os-flavor-access:is_public"] !== false
  const shouldShowEmptyState = flavorAccess.length === 0

  return (
    <>
      <DataGrid columns={2}>
        <DataGridRow>
          <DataGridHeadCell>{t`Flavor ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Tenant ID`}</DataGridHeadCell>
        </DataGridRow>

        {flavorAccess.map((access, index) => (
          <DataGridRow key={`${access.flavor_id}-${access.tenant_id}-${index}`}>
            <DataGridCell>{access.flavor_id}</DataGridCell>
            <DataGridCell>{access.tenant_id}</DataGridCell>
          </DataGridRow>
        ))}

        {shouldShowEmptyState && (
          <DataGridRow>
            <DataGridCell colSpan={2} className="text-center py-4 text-theme-default">
              {isPublicFlavor
                ? t`This is a public flavor. All tenants have access to it.`
                : t`No specific tenant access configured for this private flavor.`}
            </DataGridCell>
          </DataGridRow>
        )}
      </DataGrid>
    </>
  )
}

export const ManageAccessModal: React.FC<ManageAccessProps> = ({ client, isOpen, onClose, project, flavor }) => {
  const { t } = useLingui()

  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)
  const [flavorAccessPromise, setFlavorAccessPromise] = useState<Promise<FlavorAccess[]> | null>(null)

  const permissionsPromise = React.useMemo(() => (isOpen ? createPermissionsPromise(client) : null), [client, isOpen])

  React.useEffect(() => {
    if (isOpen && flavor?.id) {
      startTransition(() => {
        setFlavorAccessPromise(createFlavorAccessPromise(client, project, flavor.id))
      })
    }
  }, [isOpen, flavor?.id, client, project])

  const handleClose = () => {
    setMessage(null)
    setFlavorAccessPromise(null)
    onClose()
  }

  const handleAccessUpdate = (access: FlavorAccess[]) => {
    startTransition(() => {
      setFlavorAccessPromise(Promise.resolve(access))
    })
  }

  if (!isOpen || !flavor || !permissionsPromise || !flavorAccessPromise) {
    return null
  }

  return (
    <Modal onCancel={handleClose} title={t`Manage Access`} open={isOpen} size="large">
      <div>
        {message && (
          <Message onDismiss={() => setMessage(null)} text={message.text} variant={message.type} className="mb-4" />
        )}

        <Suspense fallback={<AccessLoading />}>
          <AccessContent
            permissionsPromise={permissionsPromise}
            flavorAccessPromise={flavorAccessPromise}
            client={client}
            project={project}
            flavor={flavor}
            onAccessUpdate={handleAccessUpdate}
            setMessage={setMessage}
          />
        </Suspense>
      </div>
    </Modal>
  )
}
