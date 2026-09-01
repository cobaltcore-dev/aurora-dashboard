import React, { useState, useEffect, useMemo } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import {
  Modal,
  Message,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  Stack,
  Spinner,
  Button,
  TextInput,
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

interface AccessEntry {
  tenantId: string
  isNew?: boolean
  originalTenantId?: string
}

function buildInitialAccess(flavorAccess: FlavorAccess[]): AccessEntry[] {
  return flavorAccess.map((access) => ({
    tenantId: access.tenant_id,
    isNew: false,
    originalTenantId: access.tenant_id,
  }))
}

const createPermissionsPromise = (client: TrpcClient, project: string) => {
  return client.compute.canUser
    .query({
      project_id: project,
      permission: ["flavors:add_project", "flavors:remove_project"],
    })
    .then(([canAdd, canRemove]) => ({ canAdd, canRemove }))
}

const createFlavorAccessPromise = (client: TrpcClient, project: string, flavorId: string) => {
  return client.compute.getFlavorAccess.query({
    project_id: project,
    flavorId: flavorId,
  })
}

function ManageAccessModalInner({
  client,
  project,
  flavor,
  isLoading,
  onClose,
  initialAccess,
  canAdd,
  canRemove,
}: {
  client: TrpcClient
  project: string
  flavor: Flavor
  isLoading: boolean
  onClose: () => void
  initialAccess: AccessEntry[]
  canAdd: boolean
  canRemove: boolean
}) {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [access, setAccess] = useState<AccessEntry[]>(initialAccess)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newTenantId, setNewTenantId] = useState("")
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isPublicFlavor = flavor["os-flavor-access:is_public"] !== false
  const canEdit = canAdd || canRemove

  useEffect(() => {
    if (confirmDeleteIndex !== null) {
      const timer = setTimeout(() => setConfirmDeleteIndex(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [confirmDeleteIndex])

  const hasChanges = useMemo(() => {
    if (access.length !== initialAccess.length) return true
    return access.some((entry) => entry.isNew)
  }, [access, initialAccess])

  const isSubmitDisabled = !hasChanges || isLoading || isSaving || isAddingNew

  const validateTenantId = (tenantId: string, rowIndex?: number): string | null => {
    const normalized = tenantId?.trim()
    if (!normalized) {
      return t`Tenant ID is required`
    }
    const isDuplicate = access.some((entry, idx) => entry.tenantId.trim() === normalized && idx !== rowIndex)
    if (isDuplicate) {
      return t`This tenant already has access`
    }
    return null
  }

  const handleAddNew = () => {
    const error = validateTenantId(newTenantId, access.length)
    if (error) {
      setErrors({ newTenantId: error })
      return
    }
    setAccess([...access, { tenantId: newTenantId.trim(), isNew: true }])
    setNewTenantId("")
    setIsAddingNew(false)
    setErrors({})
  }

  const handleCancelAdd = () => {
    setNewTenantId("")
    setIsAddingNew(false)
    setErrors({})
  }

  const handleDelete = (index: number) => {
    setAccess(access.filter((_, i) => i !== index))
    setConfirmDeleteIndex(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    setSaveError(null)

    try {
      // Collect tenants to remove (in initialAccess but not in current access)
      const currentTenantIds = new Set(access.map((a) => a.tenantId))
      const tenantsToRemove = initialAccess
        .filter((initial) => !currentTenantIds.has(initial.tenantId))
        .map((a) => a.originalTenantId!)
        .filter(Boolean)

      // Collect tenants to add (new entries)
      const tenantsToAdd = access.filter((entry) => entry.isNew).map((a) => a.tenantId)

      // Remove tenants
      for (const tenantId of tenantsToRemove) {
        await client.compute.removeTenantAccess.mutate({
          project_id: project,
          flavorId: flavor.id,
          targetProjectId: tenantId,
        })
      }

      // Add tenants
      for (const tenantId of tenantsToAdd) {
        await client.compute.addTenantAccess.mutate({
          project_id: project,
          flavorId: flavor.id,
          targetProjectId: tenantId,
        })
      }

      onClose()
    } catch (error) {
      setSaveError(translateError(error instanceof Error ? error.message : "Failed to save changes"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setAccess(initialAccess)
    setIsAddingNew(false)
    setNewTenantId("")
    setErrors({})
    setSaveError(null)
    onClose()
  }

  if (isPublicFlavor) {
    const flavorName = flavor.name
    return (
      <Modal open onCancel={handleClose} size="large" title={t`Manage Access - ${flavorName}`}>
        <p className="jn:text-theme-light py-8 text-center">
          {t`This is a public flavor. All tenants have access to it.`}
        </p>
      </Modal>
    )
  }

  const flavorName = flavor.name
  return (
    <Modal
      open
      onCancel={handleClose}
      size="large"
      title={t`Manage Access - ${flavorName}`}
      onConfirm={canEdit ? handleSubmit : undefined}
      confirmButtonLabel={t`Save Changes`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={isSubmitDisabled}
    >
      {isLoading ? (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      ) : (
        <div>
          {saveError && (
            <Message variant="error" text={saveError} className="mb-4" onDismiss={() => setSaveError(null)} />
          )}

          {canAdd && (
            <Stack direction="horizontal" className="jn:bg-theme-background-lvl-1 mb-4 justify-end p-2">
              <Button
                label={t`Add Tenant`}
                onClick={() => setIsAddingNew(true)}
                variant="primary"
                disabled={isAddingNew}
                icon="addCircle"
              />
            </Stack>
          )}

          {access.length === 0 && !isAddingNew ? (
            <p className="jn:text-theme-light py-8 text-center">
              {canAdd
                ? t`No tenant access configured. Click "Add Tenant" to grant access.`
                : t`No tenant access configured.`}
            </p>
          ) : (
            <DescriptionList className="mb-6">
              <DescriptionTerm>{t`Tenant ID`}</DescriptionTerm>
              <DescriptionDefinition>{t`Actions`}</DescriptionDefinition>

              <>
                {isAddingNew && (
                  <>
                    <DescriptionTerm>
                      <TextInput
                        value={newTenantId}
                        onChange={(e) => {
                          setNewTenantId(e.target.value)
                          if (errors.newTenantId) {
                            setErrors((prev) => {
                              const next = { ...prev }
                              delete next.newTenantId
                              return next
                            })
                          }
                        }}
                        placeholder={t`Enter tenant ID`}
                        errortext={errors.newTenantId}
                        autoFocus
                      />
                    </DescriptionTerm>
                    <DescriptionDefinition>
                      <Stack direction="horizontal" gap="2" alignment="center" className="justify-end">
                        <Button size="small" variant="primary" onClick={handleAddNew} icon="check" title={t`Add`} />
                        <Button
                          size="small"
                          variant="subdued"
                          onClick={handleCancelAdd}
                          icon="close"
                          title={t`Cancel`}
                        />
                      </Stack>
                    </DescriptionDefinition>
                  </>
                )}
              </>

              <>
                {access.map((entry, index) => (
                  <React.Fragment key={`${entry.originalTenantId || entry.tenantId}-${index}`}>
                    <DescriptionTerm>
                      <span className="jn:text-theme-high block max-w-xs truncate" title={entry.tenantId}>
                        {entry.tenantId}
                      </span>
                    </DescriptionTerm>
                    <DescriptionDefinition className="flex items-center justify-end gap-2">
                      {canRemove && (
                        <Stack direction="horizontal" gap="2">
                          {confirmDeleteIndex === index ? (
                            <Button
                              size="small"
                              variant="primary-danger"
                              onClick={() => handleDelete(index)}
                              data-testid={`confirm-delete-${entry.tenantId}`}
                              title={t`Remove`}
                              disabled={isAddingNew}
                            >
                              {t`Remove`}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              onClick={() => setConfirmDeleteIndex(index)}
                              icon="deleteForever"
                              data-testid={`delete-${entry.tenantId}`}
                              title={t`Remove`}
                              disabled={isAddingNew}
                            />
                          )}
                        </Stack>
                      )}
                    </DescriptionDefinition>
                  </React.Fragment>
                ))}
              </>
            </DescriptionList>
          )}
        </div>
      )}
    </Modal>
  )
}

export const ManageAccessModal: React.FC<ManageAccessProps> = ({ client, isOpen, onClose, project, flavor }) => {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [flavorAccessData, setFlavorAccessData] = useState<FlavorAccess[] | null>(null)
  const [permissionsData, setPermissionsData] = useState<{ canAdd: boolean; canRemove: boolean } | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !flavor?.id) {
      setFlavorAccessData(null)
      setPermissionsData(null)
      setLoadError(null)
      return
    }

    setIsLoadingData(true)
    setLoadError(null)

    const loadData = async () => {
      try {
        const [accessData, permissions] = await Promise.all([
          createFlavorAccessPromise(client, project, flavor.id),
          createPermissionsPromise(client, project),
        ])
        // Deduplicate
        const deduped = accessData.filter(
          (entry, idx, arr) => arr.findIndex((e) => e.tenant_id === entry.tenant_id) === idx
        )
        setFlavorAccessData(deduped)
        setPermissionsData(permissions)
      } catch (error) {
        setLoadError(translateError(error instanceof Error ? error.message : "Failed to load access data"))
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [isOpen, flavor?.id, client, project, translateError])

  const initialAccess = useMemo(
    () => (flavorAccessData ? buildInitialAccess(flavorAccessData) : []),
    [flavorAccessData]
  )

  if (!isOpen || !flavor) {
    return null
  }

  const flavorName = flavor.name

  if (isLoadingData) {
    return (
      <Modal open onCancel={onClose} size="large" title={t`Manage Access - ${flavorName}`}>
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      </Modal>
    )
  }

  if (loadError) {
    return (
      <Modal open onCancel={onClose} size="large" title={t`Manage Access - ${flavorName}`}>
        <Message variant="error" text={loadError} />
      </Modal>
    )
  }

  return (
    <ManageAccessModalInner
      key={`${flavor.id}-${JSON.stringify(flavorAccessData)}`}
      client={client}
      project={project}
      flavor={flavor}
      isLoading={false}
      onClose={onClose}
      initialAccess={initialAccess}
      canAdd={permissionsData?.canAdd ?? false}
      canRemove={permissionsData?.canRemove ?? false}
    />
  )
}
