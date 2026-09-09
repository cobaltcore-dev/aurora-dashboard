import { useState, useEffect, useMemo, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridCell,
  DataGridRow,
  DataGridHeadCell,
  DataGridToolbar,
  Stack,
  Button,
  SearchInput,
  Status,
  toast,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import type { RBACPolicy } from "@/server/Network/types/rbacPolicy"
import { RBACPolicyRow } from "./RBACPolicyRow"
import { AddRBACPolicyModal } from "../../-modals/AddRBACPolicyModal"
import { DeleteRBACPolicyDialog } from "../../-modals/DeleteRBACPolicyDialog"
import { useModal } from "@/client/utils/useModal"
import {
  getRBACPolicyDeletedToast,
  getRBACPolicyDeleteErrorToast,
} from "../../../-components/SecurityGroupToastNotifications"

const RBAC_COLUMN_COUNT = 3

interface SecurityGroupRBACPoliciesProps {
  securityGroupId: string
  canManageAccess: boolean
}

export function SecurityGroupRBACPolicies({ securityGroupId, canManageAccess }: SecurityGroupRBACPoliciesProps) {
  const utils = trpcReact.useUtils()
  const { t } = useLingui()
  const projectId = useProjectId()

  const [isAddModalOpen, toggleAddModal] = useModal()
  const [policyToDelete, setPolicyToDelete] = useState<RBACPolicy | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const debounceTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  // Query RBAC policies
  const {
    data: policies,
    isPending,
    isError,
    error,
  } = trpcReact.network.rbacPolicy.list.useQuery(
    { project_id: projectId, securityGroupId },
    {
      refetchOnWindowFocus: false,
    }
  )

  // Delete mutation
  const deleteMutation = trpcReact.network.rbacPolicy.delete.useMutation({
    onSuccess: () => {
      utils.network.rbacPolicy.list.invalidate({ project_id: projectId, securityGroupId })
      utils.network.securityGroup.getById.invalidate({ project_id: projectId, securityGroupId })
    },
    onError: (error) => {
      const { message, ...options } = getRBACPolicyDeleteErrorToast(error.message)
      toast.error(message, options)
    },
  })

  const handleDeleteClick = (policy: RBACPolicy) => {
    setPolicyToDelete(policy)
  }

  const handleConfirmDelete = (policyId: string) => {
    const targetTenant = policyToDelete?.target_tenant || policyId
    deleteMutation.mutate(
      { project_id: projectId, policyId },
      {
        onSuccess: () => {
          const { message, ...options } = getRBACPolicyDeletedToast(targetTenant)
          toast.success(message, options)
        },
      }
    )
  }

  const handleCloseDeleteDialog = () => {
    if (!deleteMutation.isPending) {
      setPolicyToDelete(null)
    }
  }

  // Close dialog after successful deletion
  useEffect(() => {
    if (!deleteMutation.isPending && !deleteMutation.error && deleteMutation.isSuccess) {
      setPolicyToDelete(null)
    }
  }, [deleteMutation.isPending, deleteMutation.error, deleteMutation.isSuccess])

  // Client-side search filtering
  const filteredPolicies = useMemo(() => {
    if (!policies) return []

    if (!searchTerm) {
      return policies
    }

    const searchLower = searchTerm.toLowerCase()
    return policies.filter(
      (policy) =>
        policy.target_tenant?.toLowerCase().includes(searchLower) || policy.action?.toLowerCase().includes(searchLower)
    )
  }, [policies, searchTerm])

  return (
    <>
      {/* Zone 1 — Share button */}
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        {canManageAccess && (
          <Button variant="primary" onClick={toggleAddModal} className="whitespace-nowrap">
            <Trans>Share Security Group</Trans>
          </Button>
        )}
      </Stack>

      {/* Zone 2 — search only (no filters needed) */}
      <DataGridToolbar>
        {/* No filters here, so the search input takes the right-hand slot on its own */}
        <Stack distribution="end" alignment="center">
          <SearchInput
            className="w-60 sm:w-68"
            placeholder={t`Search RBAC policies...`}
            data-testid="searchbar"
            value={localSearchTerm}
            onInput={(e: React.FormEvent<HTMLInputElement>) => {
              const v = e.currentTarget.value
              setLocalSearchTerm(v)
              clearTimeout(debounceTimer.current)
              debounceTimer.current = window.setTimeout(() => setSearchTerm(v), 500)
            }}
            onSearch={(v) => {
              clearTimeout(debounceTimer.current)
              setSearchTerm(typeof v === "string" ? v : "")
            }}
            onClear={() => {
              clearTimeout(debounceTimer.current)
              setLocalSearchTerm("")
              setSearchTerm("")
            }}
          />
        </Stack>
      </DataGridToolbar>

      {/* RBAC Policies Table */}
      <DataGrid columns={RBAC_COLUMN_COUNT}>
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Target Project ID</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Action</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell />
        </DataGridRow>

        {isPending ? (
          <DataGridRow>
            <DataGridCell colSpan={RBAC_COLUMN_COUNT}>
              <Status status="progress" title={t`Loading...`} />
            </DataGridCell>
          </DataGridRow>
        ) : isError ? (
          <DataGridRow>
            <DataGridCell colSpan={RBAC_COLUMN_COUNT}>
              <Status status="error" title={error.message} />
            </DataGridCell>
          </DataGridRow>
        ) : filteredPolicies.length === 0 ? (
          <DataGridRow>
            <DataGridCell colSpan={RBAC_COLUMN_COUNT}>
              <Status
                status="empty"
                title={
                  searchTerm ? t`No policies match your search` : t`There are no RBAC policies for this security group`
                }
              />
            </DataGridCell>
          </DataGridRow>
        ) : (
          filteredPolicies.map((policy) => (
            <RBACPolicyRow
              key={policy.id}
              policy={policy}
              onDelete={() => handleDeleteClick(policy)}
              canDelete={canManageAccess}
            />
          ))
        )}
      </DataGrid>

      {/* Delete Confirmation Dialog */}
      {!!policyToDelete && (
        <DeleteRBACPolicyDialog
          policy={policyToDelete}
          open={!!policyToDelete}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
          isLoading={deleteMutation.isPending}
          error={deleteMutation.error?.message || null}
        />
      )}

      {/* Add RBAC Policy Modal */}
      {isAddModalOpen && (
        <AddRBACPolicyModal isOpen={isAddModalOpen} onClose={toggleAddModal} securityGroupId={securityGroupId} />
      )}
    </>
  )
}
