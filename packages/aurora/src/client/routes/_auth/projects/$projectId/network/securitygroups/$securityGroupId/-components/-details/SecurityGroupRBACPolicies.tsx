import { useState, useEffect, useMemo, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridToolbar,
  Stack,
  Spinner,
  Button,
  Message,
  SearchInput,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import type { RBACPolicy } from "@/server/Network/types/rbacPolicy"
import { RBACPolicyRow } from "./RBACPolicyRow"
import { AddRBACPolicyModal } from "../../-modals/AddRBACPolicyModal"
import { DeleteRBACPolicyDialog } from "../../-modals/DeleteRBACPolicyDialog"
import { useModal } from "@/client/utils/useModal"

interface SecurityGroupRBACPoliciesProps {
  securityGroupId: string
}

export function SecurityGroupRBACPolicies({ securityGroupId }: SecurityGroupRBACPoliciesProps) {
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
  })

  const handleDeleteClick = (policy: RBACPolicy) => {
    setPolicyToDelete(policy)
  }

  const handleConfirmDelete = (policyId: string) => {
    deleteMutation.mutate({ project_id: projectId, policyId })
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

  if (isPending) {
    return (
      <Stack distribution="center" alignment="center" className="py-8">
        <Spinner variant="primary" />
      </Stack>
    )
  }

  if (isError) {
    return (
      <Message variant="error" className="mb-4">
        {error.message}
      </Message>
    )
  }

  const totalCount = policies?.length || 0
  const filteredCount = filteredPolicies.length

  return (
    <>
      <Stack direction="vertical" gap="4">
        {/* Zone 1 — count + Share button */}
        <Stack distribution="between" alignment="center" gap="2" className="pb-2">
          {/* Count display */}
          <span className="theme-color-text-light text-sm">
            {totalCount !== filteredCount ? (
              <Trans>
                Showing {filteredCount} of {totalCount} projects
              </Trans>
            ) : (
              <Trans>{totalCount} projects</Trans>
            )}
          </span>

          <Button variant="primary" icon="addCircle" onClick={toggleAddModal} className="whitespace-nowrap">
            <Trans>Share Security Group</Trans>
          </Button>
        </Stack>

        {/* Zone 2 — search only (no filters needed) */}
        <DataGridToolbar>
          <Stack distribution="between" alignment="center">
            <SearchInput
              placeholder={t`Search policies...`}
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
        {filteredCount === 0 ? (
          searchTerm ? (
            <Trans>No policies match your search</Trans>
          ) : (
            <Trans>There are no RBAC policies for this security group</Trans>
          )
        ) : (
          <DataGrid columns={3}>
            <DataGridRow>
              <DataGridHeadCell>
                <Trans>Target Project ID</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Action</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Actions</Trans>
              </DataGridHeadCell>
            </DataGridRow>

            {filteredPolicies.map((policy) => (
              <RBACPolicyRow key={policy.id} policy={policy} onDelete={() => handleDeleteClick(policy)} />
            ))}
          </DataGrid>
        )}
      </Stack>

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
