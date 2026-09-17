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
  toast,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"
import {
  getFlavorAccessAddedToast,
  getFlavorAccessRemovedToast,
  getFlavorAccessAddErrorToast,
  getFlavorAccessRemoveErrorToast,
} from "./FlavorToastNotifications"

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
}

function buildInitialAccess(flavorAccess: FlavorAccess[]): AccessEntry[] {
  return flavorAccess.map((access) => ({
    projectId: access.tenant_id,
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
  const [deletingProjectIds, setDeletingProjectIds] = useState<Set<string>>(new Set())
  const [addingProjectId, setAddingProjectId] = useState(false)

  const isPublicFlavor = flavor["os-flavor-access:is_public"] !== false

  const validateProjectId = (projectId: string): string | null => {
    const normalized = projectId?.trim()
    if (!normalized) {
      return t`Project ID is required`
    }
    const isDuplicate = access.some((entry) => entry.projectId.trim() === normalized)
    if (isDuplicate) {
      return t`This project already has access`
    }
    return null
  }

  const handleAddNew = async () => {
    const error = validateProjectId(newProjectId)
    if (error) {
      setErrors({ newProjectId: error })
      return
    }

    const trimmedProjectId = newProjectId.trim()
    setAddingProjectId(true)
    setErrors({})

    try {
      await client.compute.addTenantAccess.mutate({
        project_id: project,
        flavorId: flavor.id,
        targetProjectId: trimmedProjectId,
      })

      setAccess((prev) => [...prev, { projectId: trimmedProjectId }])
      setNewProjectId("")
      setIsAddingNew(false)

      const { message, ...options } = getFlavorAccessAddedToast(trimmedProjectId, flavor.name)
      toast.success(message, options)
    } catch (error) {
      const errorMessage = translateError(error instanceof Error ? error.message : "Failed to add access")
      setErrors({ newProjectId: errorMessage })
      const { message, ...options } = getFlavorAccessAddErrorToast(trimmedProjectId, errorMessage)
      toast.error(message, options)
    } finally {
      setAddingProjectId(false)
    }
  }

  const handleCancelAdd = () => {
    setNewProjectId("")
    setIsAddingNew(false)
    setErrors({})
  }

  const handleDelete = async (projectId: string) => {
    setDeletingProjectIds((prev) => new Set(prev).add(projectId))

    try {
      await client.compute.removeTenantAccess.mutate({
        project_id: project,
        flavorId: flavor.id,
        targetProjectId: projectId,
      })

      setAccess((prev) => prev.filter((a) => a.projectId !== projectId))

      const { message, ...options } = getFlavorAccessRemovedToast(projectId, flavor.name)
      toast.success(message, options)
    } catch (error) {
      const errorMessage = translateError(error instanceof Error ? error.message : "Failed to remove access")
      const { message, ...options } = getFlavorAccessRemoveErrorToast(projectId, errorMessage)
      toast.error(message, options)
    } finally {
      setDeletingProjectIds((prev) => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
    }
  }

  const handleClose = () => {
    setIsAddingNew(false)
    setNewProjectId("")
    setErrors({})
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
  const isAnyOperationInProgress = addingProjectId || deletingProjectIds.size > 0

  return (
    <Modal open onCancel={handleClose} size="large" title={t`Manage Access - ${flavorName}`}>
      {isLoading ? (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      ) : (
        <div>
          {canAdd && (
            <Stack direction="horizontal" className="mb-4 justify-end">
              <Button
                label={t`Add Project`}
                onClick={() => setIsAddingNew(true)}
                disabled={isAddingNew || isAnyOperationInProgress}
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
                                setErrors({})
                              }
                            }}
                            placeholder={t`Enter project ID`}
                            invalid={!!errors.newProjectId}
                            errortext={errors.newProjectId}
                            autoFocus
                            wrapperClassName="w-full"
                            disabled={addingProjectId}
                          />
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="small"
                            variant="primary"
                            onClick={handleAddNew}
                            icon="check"
                            title={t`Add`}
                            disabled={addingProjectId}
                            progress={addingProjectId}
                          />
                          <Button
                            size="small"
                            variant="subdued"
                            onClick={handleCancelAdd}
                            icon="close"
                            title={t`Cancel`}
                            disabled={addingProjectId}
                          />
                        </div>
                      </div>
                    </DescriptionDefinition>
                  </>
                )}
              </>

              <>
                {access.map((entry) => {
                  const isDeleting = deletingProjectIds.has(entry.projectId)
                  return (
                    <React.Fragment key={entry.projectId}>
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
                              onClick={() => handleDelete(entry.projectId)}
                              icon="deleteForever"
                              data-testid={`delete-${entry.projectId}`}
                              title={t`Remove`}
                              disabled={isDeleting || isAddingNew}
                              progress={isDeleting}
                            />
                          )}
                        </Stack>
                      </DescriptionDefinition>
                    </React.Fragment>
                  )
                })}
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
