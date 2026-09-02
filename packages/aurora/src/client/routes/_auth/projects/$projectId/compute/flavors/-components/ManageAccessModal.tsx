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
  projectId: string
  isNew?: boolean
  originalProjectId?: string
}

function buildInitialAccess(flavorAccess: FlavorAccess[]): AccessEntry[] {
  return flavorAccess.map((access) => ({
    projectId: access.tenant_id,
    isNew: false,
    originalProjectId: access.tenant_id,
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
  const [newProjectId, setNewProjectId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isPublicFlavor = flavor["os-flavor-access:is_public"] !== false
  const canEdit = canAdd || canRemove

  const hasChanges = useMemo(() => {
    const currentProjectIds = new Set(access.map((a) => a.projectId))
    const initialProjectIds = new Set(initialAccess.map((a) => a.projectId))
    if (currentProjectIds.size !== initialProjectIds.size) return true
    for (const id of currentProjectIds) {
      if (!initialProjectIds.has(id)) return true
    }
    return false
  }, [access, initialAccess])

  const isSubmitDisabled = !hasChanges || isLoading || isSaving || isAddingNew

  const validateProjectId = (projectId: string, rowIndex?: number): string | null => {
    const normalized = projectId?.trim()
    if (!normalized) {
      return t`Project ID is required`
    }
    const isDuplicate = access.some((entry, idx) => entry.projectId.trim() === normalized && idx !== rowIndex)
    if (isDuplicate) {
      return t`This project already has access`
    }
    return null
  }

  const handleAddNew = () => {
    const error = validateProjectId(newProjectId, access.length)
    if (error) {
      setErrors({ newProjectId: error })
      return
    }
    setAccess([...access, { projectId: newProjectId.trim(), isNew: true }])
    setNewProjectId("")
    setIsAddingNew(false)
    setErrors({})
  }

  const handleCancelAdd = () => {
    setNewProjectId("")
    setIsAddingNew(false)
    setErrors({})
  }

  const handleDelete = (index: number) => {
    setAccess(access.filter((_, i) => i !== index))
    setErrors({})
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    setSaveError(null)

    try {
      const currentProjectIds = new Set(access.map((a) => a.projectId))
      const initialProjectIds = new Set(initialAccess.map((a) => a.projectId))

      // Collect projects to remove (in initialAccess but not in current access)
      const projectsToRemove = initialAccess
        .filter((initial) => !currentProjectIds.has(initial.projectId))
        .map((a) => a.originalProjectId!)
        .filter(Boolean)

      // Collect projects to add (in current access but not in initialAccess)
      const projectsToAdd = access.filter((entry) => !initialProjectIds.has(entry.projectId)).map((a) => a.projectId)

      // Remove projects
      for (const targetProjectId of projectsToRemove) {
        await client.compute.removeTenantAccess.mutate({
          project_id: project,
          flavorId: flavor.id,
          targetProjectId,
        })
      }

      // Add projects
      for (const targetProjectId of projectsToAdd) {
        await client.compute.addTenantAccess.mutate({
          project_id: project,
          flavorId: flavor.id,
          targetProjectId,
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
    setNewProjectId("")
    setErrors({})
    setSaveError(null)
    onClose()
  }

  if (isPublicFlavor) {
    const flavorName = flavor.name
    return (
      <Modal open onCancel={handleClose} size="large" title={t`Manage Access - ${flavorName}`}>
        <p className="jn:text-theme-light py-8 text-center">
          {t`This is a public flavor. All projects have access to it.`}
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
      confirmButtonLabel={isSaving ? t`Saving...` : t`Save Changes`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={isSubmitDisabled}
      disableCancelButton={isSaving}
      disableCloseButton={isSaving}
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
                label={t`Add Project`}
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
                ? t`No project access configured. Click "Add Project" to grant access.`
                : t`No project access configured.`}
            </p>
          ) : (
            <DescriptionList className="mb-6">
              <>
                {isAddingNew && (
                  <>
                    <DescriptionTerm className="flex items-center justify-end">
                      <span className="jn:text-theme-high">{t`Project`}</span>
                    </DescriptionTerm>
                    <DescriptionDefinition>
                      <div className="flex w-full items-center gap-2">
                        <div className="flex-1">
                          <TextInput
                            value={newProjectId}
                            onChange={(e) => {
                              setNewProjectId(e.target.value)
                              if (errors.newProjectId) {
                                setErrors((prev) => {
                                  const next = { ...prev }
                                  delete next.newProjectId
                                  return next
                                })
                              }
                            }}
                            placeholder={t`Enter project ID`}
                            errortext={errors.newProjectId}
                            autoFocus
                            wrapperClassName="w-full"
                          />
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="small" variant="primary" onClick={handleAddNew} icon="check" title={t`Add`} />
                          <Button
                            size="small"
                            variant="subdued"
                            onClick={handleCancelAdd}
                            icon="close"
                            title={t`Cancel`}
                          />
                        </div>
                      </div>
                    </DescriptionDefinition>
                  </>
                )}
              </>

              <>
                {access.map((entry, index) => (
                  <React.Fragment key={`${entry.originalProjectId || entry.projectId}-${index}`}>
                    <DescriptionTerm>
                      <span className="jn:text-theme-high">{t`Project`}</span>
                    </DescriptionTerm>
                    <DescriptionDefinition>
                      <Stack direction="horizontal" gap="2" alignment="center" className="justify-between">
                        <span className="jn:text-theme-high block max-w-xs truncate" title={entry.projectId}>
                          {entry.projectId}
                        </span>
                        {canRemove && (
                          <Button
                            size="small"
                            onClick={() => handleDelete(index)}
                            icon="deleteForever"
                            data-testid={`delete-${entry.projectId}`}
                            title={t`Remove`}
                            disabled={isAddingNew}
                          />
                        )}
                      </Stack>
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

    let cancelled = false
    setIsLoadingData(true)
    setLoadError(null)

    const loadData = async () => {
      try {
        const [accessData, permissions] = await Promise.all([
          createFlavorAccessPromise(client, project, flavor.id),
          createPermissionsPromise(client, project),
        ])
        if (cancelled) return
        // Deduplicate
        const deduped = accessData.filter(
          (entry, idx, arr) => arr.findIndex((e) => e.tenant_id === entry.tenant_id) === idx
        )
        setFlavorAccessData(deduped)
        setPermissionsData(permissions)
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : "Failed to load access data")
      } finally {
        if (!cancelled) setIsLoadingData(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [isOpen, flavor?.id, client, project])

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
        <Message variant="error" text={translateError(loadError)} />
      </Modal>
    )
  }

  return (
    <ManageAccessModalInner
      key={flavor.id}
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
