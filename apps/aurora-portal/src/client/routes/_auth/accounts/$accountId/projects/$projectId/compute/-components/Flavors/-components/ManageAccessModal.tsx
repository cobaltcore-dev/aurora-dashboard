import React, { use, Suspense, useState, startTransition, useEffect } from "react"
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
  Button,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"
import { TenantAccessFormRow } from "./TenantAccessFormRow"
import { TenantAccessRow } from "./TenantAccessRow"

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
      <DataGridCell colSpan={3}>
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
  isAddingAccess,
  setIsAddingAccess,
  setMessage,
}: {
  permissionsPromise: Promise<{ canAdd: boolean; canRemove: boolean }>
  flavorAccessPromise: Promise<FlavorAccess[]>
  client: TrpcClient
  project: string
  flavor: Flavor
  onAccessUpdate: (access: FlavorAccess[]) => void
  isAddingAccess: boolean
  setIsAddingAccess: (adding: boolean) => void
  setMessage: (msg: { text: string; type: "error" | "success" } | null) => void
}) {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const permissions = use(permissionsPromise)
  const flavorAccess = use(flavorAccessPromise) // Direkt verwenden - React 19 macht es reaktiv

  const [tenantId, setTenantId] = useState("")
  const [errors, setErrors] = useState<{ tenantId?: string }>({})
  const [deletingTenants, setDeletingTenants] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const isPublicFlavor = flavor["os-flavor-access:is_public"] !== false
  const shouldShowEmptyState = flavorAccess.length === 0 && !isAddingAccess

  const validateForm = () => {
    const trimmedTenantId = tenantId.trim()
    const newErrors: { tenantId?: string } = {}

    if (!trimmedTenantId) {
      newErrors.tenantId = "Tenant ID is required."
    } else if (flavorAccess.some((access) => access.tenant_id === trimmedTenantId)) {
      newErrors.tenantId = "This tenant already has access to this flavor."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setTenantId("")
    setErrors({})
  }

  const handleSave = async () => {
    if (!validateForm()) {
      setMessage({ text: t`Please fix the validation errors below.`, type: "error" })
      return
    }

    setIsLoading(true)
    try {
      const trimmedTenantId = tenantId.trim()

      const updatedAccess = await client.compute.addTenantAccess.mutate({
        projectId: project,
        flavorId: flavor.id,
        tenantId: trimmedTenantId,
      })

      onAccessUpdate(updatedAccess)

      setMessage({
        text: t`Tenant access for "${trimmedTenantId}" has been added successfully.`,
        type: "success",
      })
      resetForm()
      setIsAddingAccess(false)
    } catch (error) {
      const errorMessage = (error as Error)?.message || "Failed to add tenant access"

      setMessage({
        text: translateError(errorMessage || "Failed to add tenant access"),
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveTenant = async (tenantIdToRemove: string) => {
    setDeletingTenants((prev) => new Set(prev).add(tenantIdToRemove))

    try {
      const updatedAccess = await client.compute.removeTenantAccess.mutate({
        projectId: project,
        flavorId: flavor.id,
        tenantId: tenantIdToRemove,
      })

      onAccessUpdate(updatedAccess)
      setMessage({
        text: t`Tenant access for "${tenantIdToRemove}" has been removed successfully.`,
        type: "success",
      })
    } catch (error) {
      const errorMessage = (error as Error)?.message || "Failed to remove tenant access"

      setMessage({
        text: translateError(errorMessage || `Failed to remove tenant access for "${tenantIdToRemove}"`),
        type: "error",
      })
    } finally {
      setDeletingTenants((prev) => {
        const newSet = new Set(prev)
        newSet.delete(tenantIdToRemove)
        return newSet
      })
    }
  }

  const handleTenantIdChange = (newTenantId: string) => {
    setTenantId(newTenantId)
    if (errors.tenantId) setErrors((prev) => ({ ...prev, tenantId: undefined }))
  }

  if (isPublicFlavor) {
    return (
      <DataGrid columns={3}>
        <DataGridRow>
          <DataGridHeadCell>{t`Flavor ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Tenant ID`}</DataGridHeadCell>
          <DataGridHeadCell> </DataGridHeadCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridCell colSpan={3} className="text-center py-4 text-theme-default">
            {t`This is a public flavor. All tenants have access to it.`}
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <>
      {permissions.canAdd && (
        <Stack direction="horizontal" className="bg-theme-background-lvl-1 justify-end p-2">
          <Button
            icon="addCircle"
            label={t`Add Tenant Access`}
            data-testid="addTenantButton"
            onClick={() => setIsAddingAccess(true)}
            variant="primary"
            disabled={isAddingAccess}
          />
        </Stack>
      )}

      <DataGrid columns={3}>
        <DataGridRow>
          <DataGridHeadCell>{t`Flavor ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Tenant ID`}</DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {isAddingAccess && (
          <TenantAccessFormRow
            tenantId={tenantId}
            flavorId={flavor.id}
            errors={errors}
            isLoading={isLoading}
            onTenantIdChange={handleTenantIdChange}
            onSave={handleSave}
            onCancel={() => {
              resetForm()
              setIsAddingAccess(false)
              setMessage(null)
            }}
          />
        )}

        {flavorAccess.map((access, index) => (
          <TenantAccessRow
            key={`${access.tenant_id}-${index}`}
            access={access}
            isDeleting={deletingTenants.has(access.tenant_id)}
            onDelete={() => handleRemoveTenant(access.tenant_id)}
            canDelete={permissions.canRemove}
          />
        ))}

        {shouldShowEmptyState && (
          <DataGridRow>
            <DataGridCell colSpan={3} className="text-center py-4 text-theme-default">
              {t`No specific tenant access configured for this private flavor. Click "Add Tenant Access" to grant access.`}
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
  const [isAddingAccess, setIsAddingAccess] = useState(false)
  const [flavorAccessPromise, setFlavorAccessPromise] = useState<Promise<FlavorAccess[]> | null>(null)

  const permissionsPromise = React.useMemo(() => (isOpen ? createPermissionsPromise(client) : null), [client, isOpen])

  useEffect(() => {
    if (isOpen && flavor?.id) {
      startTransition(() => {
        setFlavorAccessPromise(createFlavorAccessPromise(client, project, flavor.id))
      })
    }
  }, [isOpen, flavor?.id, client, project])

  const handleClose = () => {
    setMessage(null)
    setIsAddingAccess(false)
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
  const flavorName = flavor.name

  return (
    <Modal onCancel={handleClose} title={t`Manage Access - ${flavorName}`} open={isOpen} size="large">
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
            isAddingAccess={isAddingAccess}
            setIsAddingAccess={setIsAddingAccess}
            setMessage={setMessage}
          />
        </Suspense>
      </div>
    </Modal>
  )
}
