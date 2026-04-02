import { useState, useEffect, useMemo } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  Stack,
  Spinner,
  Button,
  Message,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import type { RBACPolicy } from "@/server/Network/types/rbacPolicy"
import { RBACPolicyRow } from "./RBACPolicyRow"
import { AddRBACPolicyModal } from "../../-modals/AddRBACPolicyModal"
import { DeleteRBACPolicyDialog } from "../../-modals/DeleteRBACPolicyDialog"
import { ListToolbar } from "@/client/components/ListToolbar"

interface SecurityGroupRBACPoliciesProps {
  securityGroupId: string
}

export function SecurityGroupRBACPolicies({ securityGroupId }: SecurityGroupRBACPoliciesProps) {
  const utils = trpcReact.useUtils()
  const { t } = useLingui()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [policyToDelete, setPolicyToDelete] = useState<RBACPolicy | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Query RBAC policies
  const {
    data: policies,
    isPending,
    isError,
    error,
  } = trpcReact.network.rbacPolicy.list.useQuery(
    { securityGroupId },
    {
      refetchOnWindowFocus: false,
    }
  )

  // Delete mutation
  const deleteMutation = trpcReact.network.rbacPolicy.delete.useMutation({
    onSuccess: () => {
      utils.network.rbacPolicy.list.invalidate({ securityGroupId })
      utils.network.securityGroup.getById.invalidate({ securityGroupId })
    },
  })

  const handleDeleteClick = (policy: RBACPolicy) => {
    setPolicyToDelete(policy)
  }

  const handleConfirmDelete = (policyId: string) => {
    deleteMutation.mutate({ policyId })
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

  const handleSearchChange = (value: string | number | string[] | undefined) => {
    const searchValue = typeof value === "string" ? value : ""
    setSearchTerm(searchValue)
  }

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
        {/* Toolbar with Share button and search - same pattern as Rules */}
        <ListToolbar
          totalCount={totalCount}
          filteredCount={filteredCount}
          itemName={t`projects`}
          searchTerm={searchTerm}
          onSearch={handleSearchChange}
          actions={
            <Button variant="primary" icon="addCircle" onClick={() => setIsAddModalOpen(true)}>
              <Trans>Share Security Group</Trans>
            </Button>
          }
        />

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
        <AddRBACPolicyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          securityGroupId={securityGroupId}
        />
      )}
    </>
  )
}
