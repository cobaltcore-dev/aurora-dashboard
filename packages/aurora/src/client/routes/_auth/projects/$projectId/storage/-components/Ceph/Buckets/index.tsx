import { useState, useEffect, useRef, startTransition, type ReactNode } from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import { plural } from "@lingui/core/macro"
import { useNavigate } from "@tanstack/react-router"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { Bucket } from "@/server/Storage/types/ceph"
import { trpcReact } from "@/client/trpcClient"
import {
  Button,
  ButtonRow,
  Checkbox,
  DataGridToolbar,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
  SearchInput,
  Stack,
  Status,
  toast,
} from "@cloudoperators/juno-ui-components"
import { BucketTableView } from "./BucketTableView"
import {
  getBucketCreatedToast,
  getBucketEmptiedToast,
  getBucketDeletedToast,
  getBucketDeleteErrorToast,
  getBucketsEmptyCompleteToast,
} from "./BucketToastNotifications"
import { EmptyBucketsModal } from "./EmptyBucketsModal"
import { CredentialPrompt } from "../Credentials/CredentialPrompt"
import { ManageCredentialsModal } from "../Credentials/ManageCredentialsModal"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useCephPermissions } from "../hooks/useCephPermissions"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/index"

export { CreateBucketModal } from "./CreateBucketModal"
export { DeleteBucketModal } from "./DeleteBucketModal"
export { DeleteBucketPolicyModal } from "./DeleteBucketPolicyModal"
export { EmptyBucketModal } from "./EmptyBucketModal"
export { EmptyBucketsModal } from "./EmptyBucketsModal"
export { DeleteVersionsModal } from "./DeleteVersionsModal"
export { CorsRulesTab as CephCorsRules } from "./CorsRulesTab"
export { LifecycleRulesTab as CephLifecycleRules } from "./LifecycleRulesTab"
export * from "./BucketToastNotifications"

export const CephBuckets = () => {
  const { t, i18n } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate({ from: Route.fullPath })

  // Sort and search state are persisted in the URL so they survive navigation,
  // browser back/forward, and deep links.
  const { sortBy, sortDirection, search: searchParam = "" } = Route.useSearch()

  const { permissions } = useCephPermissions(projectId)
  const hasAnyBulkAction = permissions.canEmptyBucket

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [emptyAllModalOpen, setEmptyAllModalOpen] = useState(false)
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([])
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false)

  // Local mirror of the committed search term so typing stays responsive while
  // the URL commit is debounced (see Zone 2 SearchInput below).
  const [localSearchTerm, setLocalSearchTerm] = useState(searchParam)
  const debounceTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  // Keep the input in sync when the committed search term changes from outside
  // the input — browser back/forward, deep links, or programmatic navigation —
  // so the field never drifts from the URL-backed filter state. When the change
  // originated from our own debounced commit, searchParam already equals
  // localSearchTerm, so this is a no-op and won't disturb the caret.
  useEffect(() => {
    setLocalSearchTerm(searchParam)
  }, [searchParam])

  const handleCreateSuccess = (bucketName: string) => {
    const { message, ...options } = getBucketCreatedToast(bucketName)

    toast.success(message, options)
  }

  const handleEmptySuccess = (bucketName: string, deletedCount: number) => {
    const { message, ...options } = getBucketEmptiedToast(bucketName, deletedCount)

    toast.success(message, options)
  }

  const handleDeleteSuccess = (bucketName: string) => {
    const { message, ...options } = getBucketDeletedToast(bucketName)

    toast.success(message, options)
  }

  const handleDeleteError = (bucketName: string, errorMessage: string) => {
    const { message, ...options } = getBucketDeleteErrorToast(bucketName, errorMessage)

    toast.error(message, options)
  }

  const handleEmptyAllComplete = ({
    emptiedCount,
    totalDeleted,
    errors,
  }: {
    emptiedCount: number
    totalDeleted: number
    errors: string[]
  }) => {
    if (errors.length === 0) {
      setSelectedBuckets([])
    } else {
      // Extract the bucket name from each error string formatted as "<bucketName>: <message>".
      // Using exact name extraction avoids the false-positive substring match that
      // errorMessage.includes(bucketName) would produce (e.g. "foo" matched inside "foobar" error).
      const failedBucketNames = new Set(errors.map((e) => e.split(": ")[0]))
      setSelectedBuckets((prev) => prev.filter((name) => failedBucketNames.has(name)))
    }

    const { message, ...options } = getBucketsEmptyCompleteToast(emptiedCount, totalDeleted, errors)

    if (errors.length > 0) {
      toast.warning(message, options)
    } else {
      toast.success(message, options)
    }
  }

  const sortSettings: SortSettings = {
    options: [
      { label: t`Bucket Name`, value: "name" },
      { label: t`Object Count`, value: "count" },
      { label: t`Total Size`, value: "bytes" },
      { label: t`Last Modified`, value: "last_modified" },
    ],
    sortBy: sortBy ?? "name",
    sortDirection: sortDirection ?? "asc",
  }

  // Fetch buckets from tRPC
  const {
    data: buckets,
    isLoading,
    error,
  } = trpcReact.storage.ceph.containers.list.useQuery(
    {
      project_id: projectId,
      includeMetadata: true, // Fetch full metadata for table view with sorting
    },
    {
      enabled: !!projectId,
      retry: false, // Don't retry on NO_CEPH_CREDENTIALS error
    }
  )

  // Sort buckets based on sort settings
  const sortBuckets = (buckets: Bucket[]): Bucket[] => {
    return [...buckets].sort((a, b) => {
      let comparison: number

      switch (sortBy ?? "name") {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "count":
          comparison = a.count - b.count
          break
        case "bytes":
          comparison = a.bytes - b.bytes
          break
        case "last_modified":
          if (!a.last_modified && !b.last_modified) {
            return 0
          }
          if (!a.last_modified) {
            return 1
          }
          if (!b.last_modified) {
            return -1
          }
          comparison = new Date(a.last_modified).getTime() - new Date(b.last_modified).getTime()
          break
        default:
          comparison = a.name.localeCompare(b.name)
      }

      return (sortDirection ?? "asc") === "desc" ? -comparison : comparison
    })
  }

  // Filter buckets based on search term
  const filteredBuckets = (buckets || []).filter((bucket) =>
    bucket.name.toLowerCase().includes(searchParam.toLowerCase())
  )

  // Apply sorting to filtered buckets
  const sortedBuckets = sortBuckets(filteredBuckets)

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const value = typeof term === "string" ? term : ""
    startTransition(() => {
      navigate({
        search: (prev) => ({ ...prev, search: value || undefined }),
      })
    })
  }

  const handleSortChange = (newSortSettings: SortSettings) => {
    const resolvedSortBy = (newSortSettings.sortBy?.toString() || "name") as
      "name" | "count" | "bytes" | "last_modified"
    const resolvedDirection = (newSortSettings.sortDirection || "asc") as "asc" | "desc"
    startTransition(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy: resolvedSortBy,
          sortDirection: resolvedDirection,
        }),
      })
    })
  }

  // Rendered below into a single unconditional return, alongside ManageCredentialsModal.
  // Early `return`s here would unmount that modal the moment this state changes underneath
  // it - which happens, for example, the instant the last credential is deleted from inside
  // the (still open) modal and this query flips to the NO_CEPH_CREDENTIALS error branch.
  let content: ReactNode

  if (isLoading) {
    content = <Status status="progress" title={t`Loading Buckets...`} />
  } else if (error) {
    const errorMessage = error.message

    if (errorMessage === "NO_CEPH_CREDENTIALS") {
      content = <CredentialPrompt onManageCredentials={() => setCredentialsModalOpen(true)} />
    } else {
      const isAccessDenied = errorMessage.includes("Access denied") || errorMessage.includes("AccessDenied")
      // RGW returns InvalidAccessKeyId when the key backing this session no longer exists in
      // Keystone (deleted by this user elsewhere, or by an admin) or its blob failed to decrypt.
      // EC2 credentials carry no expiry (no `expires_at`/`created_at` on the Keystone object),
      // so "expired" is never an accurate description of this failure.
      const isAuthError = errorMessage.includes("Invalid access key") || errorMessage.includes("InvalidAccessKeyId")

      if (isAuthError) {
        content = (
          <Status
            status="error"
            title={t`S3 Credentials No Longer Valid`}
            body={t`They may have been deleted. Create new credentials to continue.`}
            action={
              <ButtonRow>
                <Button onClick={() => setCredentialsModalOpen(true)}>
                  <Trans>Manage Credentials</Trans>
                </Button>
              </ButtonRow>
            }
          />
        )
      } else {
        content = (
          <div>
            <p className="text-theme-default text-sm">
              {isAccessDenied ? (
                <Trans>
                  Your credentials are valid but you don't have permission to perform this operation. Please contact
                  your administrator to grant you the necessary permissions.
                </Trans>
              ) : (
                <Trans>Failed to Load Buckets: {errorMessage}</Trans>
              )}
            </p>
          </div>
        )
      }
    }
  } else {
    // Resolve selected Bucket objects from the full unfiltered list so
    // the modal always operates on what was actually selected — not the filtered
    // subset currently visible in the table.
    const selectedBucketSummaries = (buckets || []).filter((c) => selectedBuckets.includes(c.name))
    const hasSelection = selectedBucketSummaries.length > 0
    const selectedCount = selectedBucketSummaries.length
    const totalCount = (buckets || []).length
    const filteredCount = filteredBuckets.length

    // Select-all operates on the currently displayed (filtered + sorted) rows.
    const displayedNames = sortedBuckets.map((c) => c.name)
    const allSelected = displayedNames.length > 0 && displayedNames.every((n) => selectedBuckets.includes(n))
    const someSelected = displayedNames.some((n) => selectedBuckets.includes(n))
    const handleToggleSelectAll = () => {
      if (allSelected) {
        setSelectedBuckets((prev) => prev.filter((n) => !displayedNames.includes(n)))
      } else {
        setSelectedBuckets((prev) => [...new Set([...prev, ...displayedNames])])
      }
    }

    content = (
      <>
        <Stack direction="vertical">
          {/* Zone 1 — sort controls, the credentials overflow menu, and the create action
              (plain Stack, no background) */}
          <Stack distribution="end" alignment="center" gap="2" className="pb-2">
            <Stack gap="0.5" alignment="center">
              <SortInput
                options={sortSettings.options}
                sortBy={sortSettings.sortBy}
                sortDirection={sortSettings.sortDirection ?? "asc"}
                selectClassName="min-w-40"
                onSortByChange={(value) =>
                  handleSortChange({ ...sortSettings, sortBy: value, sortDirection: sortSettings.sortDirection })
                }
                onSortDirectionChange={(direction) => handleSortChange({ ...sortSettings, sortDirection: direction })}
              />
            </Stack>
            <Stack gap="0.5" alignment="center">
              <PopupMenu className="flex items-center">
                <PopupMenuToggle as="div">
                  <Button icon="moreVert" title={t`More Actions`} aria-label={t`More Actions`} />
                </PopupMenuToggle>
                <PopupMenuOptions>
                  {/* Not permission-gated: opening the modal is a read. Mutations inside it are
                      gated (see the useCephPermissions docblock — reads are deliberately never
                      gated). */}
                  <PopupMenuItem
                    label={t`Manage Credentials`}
                    onClick={() => setCredentialsModalOpen(true)}
                    data-testid="manage-credentials-action"
                  />
                </PopupMenuOptions>
              </PopupMenu>
              {permissions.canCreateBucket && (
                <Button variant="primary" className="whitespace-nowrap" onClick={() => setCreateModalOpen(true)}>
                  <Trans>Create Bucket</Trans>
                </Button>
              )}
            </Stack>
          </Stack>

          {/* Zone 2 — debounced search. DataGridToolbar provides the background.
              Ceph buckets expose no filterable dimensions yet, so there is no
              FiltersInput / SelectedFilters here. When filter dimensions are added,
              add FiltersInput alongside the search (switch the inner Stack to
              distribution="between") and render SelectedFilters below. */}
          <DataGridToolbar>
            <Stack direction="vertical" gap="2">
              <Stack distribution="end" alignment="center">
                <SearchInput
                  placeholder={t`Search buckets...`}
                  data-testid="searchbar"
                  value={localSearchTerm}
                  onInput={(e) => {
                    const v = e.currentTarget.value
                    setLocalSearchTerm(v)
                    clearTimeout(debounceTimer.current)
                    debounceTimer.current = window.setTimeout(() => handleSearchChange(v), 500)
                  }}
                  onSearch={(v) => {
                    clearTimeout(debounceTimer.current)
                    handleSearchChange(typeof v === "string" ? v : "")
                  }}
                  onClear={() => {
                    clearTimeout(debounceTimer.current)
                    setLocalSearchTerm("")
                    handleSearchChange("")
                  }}
                />
              </Stack>
            </Stack>
          </DataGridToolbar>

          {/* Zone 3 — bulk actions (gated) plus the bucket count. The bar also hosts the
              count info, which must always be visible, so it always renders; only the
              bulk controls are gated. */}
          <DataGridToolbar>
            <Stack distribution="between" gap="2" alignment="center" className="text-sm">
              {hasAnyBulkAction ? (
                <Stack gap="2" alignment="center">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={handleToggleSelectAll}
                  />
                  <PopupMenu className="flex items-center">
                    <PopupMenuToggle as="div">
                      <Button disabled={!hasSelection} size="small" icon="moreVert" label={t`Actions`} />
                    </PopupMenuToggle>
                    {hasSelection && (
                      <PopupMenuOptions>
                        <PopupMenuItem
                          disabled={!hasSelection}
                          label={i18n._(
                            plural(selectedCount, {
                              one: "Empty Bucket",
                              other: "Empty Buckets",
                            })
                          )}
                          onClick={() => setEmptyAllModalOpen(true)}
                        />
                      </PopupMenuOptions>
                    )}
                  </PopupMenu>
                </Stack>
              ) : (
                <span />
              )}

              <div className="text-theme-light flex items-center gap-1" data-testid="buckets-info-block">
                {searchParam.trim() ? (
                  <Plural
                    value={totalCount}
                    one={`${filteredCount} of ${totalCount} bucket`}
                    other={`${filteredCount} of ${totalCount} buckets`}
                  />
                ) : (
                  <Plural value={totalCount} one={`${totalCount} bucket`} other={`${totalCount} buckets`} />
                )}
              </div>
            </Stack>
          </DataGridToolbar>
        </Stack>

        <BucketTableView
          buckets={sortedBuckets}
          createModalOpen={createModalOpen}
          setCreateModalOpen={setCreateModalOpen}
          onCreateSuccess={handleCreateSuccess}
          existingBuckets={buckets}
          onEmptySuccess={handleEmptySuccess}
          onDeleteSuccess={handleDeleteSuccess}
          onDeleteError={handleDeleteError}
          selectedBuckets={selectedBuckets}
          setSelectedBuckets={setSelectedBuckets}
          hasAnyBulkAction={hasAnyBulkAction}
          canEmptyBucket={permissions.canEmptyBucket}
          canDeleteBucket={permissions.canDeleteBucket}
        />

        <EmptyBucketsModal
          isOpen={emptyAllModalOpen}
          buckets={selectedBucketSummaries}
          onClose={() => setEmptyAllModalOpen(false)}
          onComplete={handleEmptyAllComplete}
        />
      </>
    )
  }

  return (
    <div className="relative">
      {content}
      <ManageCredentialsModal isOpen={credentialsModalOpen} onClose={() => setCredentialsModalOpen(false)} />
    </div>
  )
}
