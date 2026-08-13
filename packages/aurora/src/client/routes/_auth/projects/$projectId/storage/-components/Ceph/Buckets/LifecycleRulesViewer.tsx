import { Trans } from "@lingui/react/macro"
import { Button, Icon } from "@cloudoperators/juno-ui-components"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"

interface LifecycleRulesViewerProps {
  rules: LifecycleRuleRead[]
  onAddRule: () => void
  onEditRule: (index: number) => void
  onDeleteRule: (index: number) => void
}

export const LifecycleRulesViewer = ({ rules, onAddRule, onEditRule, onDeleteRule }: LifecycleRulesViewerProps) => {
  return (
    <div>
      {/* Description */}
      <p className="text-theme-default mb-4 text-sm">
        <Trans>
          Lifecycle rules automate object management: expire (delete) objects after N days, transition to different
          storage classes, clean up old versions, and abort incomplete multipart uploads.
        </Trans>
      </p>

      {/* Add New Rule Button */}
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={onAddRule}>
          <Trans>Add New Rule</Trans>
        </Button>
      </div>

      {/* Separator */}
      <div className="border-theme-default mb-4 border-t" />

      {/* Rules List */}
      <div className="space-y-6">
        {rules.map((rule, index) => (
          <RuleCard
            key={index}
            rule={rule}
            index={index}
            onEdit={() => onEditRule(index)}
            onDelete={() => onDeleteRule(index)}
          />
        ))}
      </div>
    </div>
  )
}

interface RuleCardProps {
  rule: LifecycleRuleRead
  index: number
  onEdit: () => void
  onDelete: () => void
}

const RuleCard = ({ rule, onEdit, onDelete }: RuleCardProps) => {
  const {
    ID,
    Status,
    Prefix: legacyPrefix,
    Filter,
    Expiration,
    Transitions,
    NoncurrentVersionExpiration,
    NoncurrentVersionTransitions,
    AbortIncompleteMultipartUpload,
  } = rule

  // Helper to format filter display
  // Item 23 fix: Fall back to legacy Prefix field when Filter is absent
  const formatFilter = (filter: typeof Filter, legacyPrefix?: string): string => {
    if (!filter) {
      // No Filter - check for legacy top-level Prefix
      if (legacyPrefix) {
        return `Prefix: ${legacyPrefix}`
      }
      return "All objects"
    }
    const parts: string[] = []

    if (filter.Prefix) parts.push(`Prefix: ${filter.Prefix}`)
    if (filter.Tag) parts.push(`Tag: ${filter.Tag.Key}=${filter.Tag.Value}`)
    if (filter.ObjectSizeGreaterThan !== undefined) parts.push(`Size > ${filter.ObjectSizeGreaterThan} bytes`)
    if (filter.ObjectSizeLessThan !== undefined) parts.push(`Size < ${filter.ObjectSizeLessThan} bytes`)

    if (filter.And) {
      const andParts: string[] = []
      if (filter.And.Prefix) andParts.push(`Prefix: ${filter.And.Prefix}`)
      if (filter.And.Tags) {
        filter.And.Tags.forEach((tag) => andParts.push(`Tag: ${tag.Key}=${tag.Value}`))
      }
      if (filter.And.ObjectSizeGreaterThan !== undefined)
        andParts.push(`Size > ${filter.And.ObjectSizeGreaterThan} bytes`)
      if (filter.And.ObjectSizeLessThan !== undefined) andParts.push(`Size < ${filter.And.ObjectSizeLessThan} bytes`)
      parts.push(`(${andParts.join(" AND ")})`)
    }

    return parts.length > 0 ? parts.join(", ") : "All objects"
  }

  // Helper to format expiration display
  const formatExpiration = (expiration: typeof Expiration): string => {
    if (!expiration) return "–"
    if (expiration.Days) return `After ${expiration.Days} days`
    if (expiration.Date) {
      const date = typeof expiration.Date === "string" ? new Date(expiration.Date) : expiration.Date
      return `On ${date.toLocaleDateString()}`
    }
    if (expiration.ExpiredObjectDeleteMarker) return "Clean up expired delete markers"
    return "–"
  }

  // Helper to format transitions display
  const formatTransitions = (transitions: typeof Transitions): string => {
    if (!transitions || transitions.length === 0) return "–"
    return transitions
      .map((t) => {
        const time = t.Days
          ? `${t.Days} days`
          : t.Date
            ? new Date(typeof t.Date === "string" ? t.Date : t.Date).toLocaleDateString()
            : "unknown"
        return `${t.StorageClass} after ${time}`
      })
      .join("; ")
  }

  // Helper to format noncurrent version expiration
  const formatNoncurrentExpiration = (noncurrentExp: typeof NoncurrentVersionExpiration): string => {
    if (!noncurrentExp) return "–"
    const parts: string[] = []
    if (noncurrentExp.NoncurrentDays) {
      parts.push(`After ${noncurrentExp.NoncurrentDays} days`)
    }
    if (noncurrentExp.NewerNoncurrentVersions !== undefined) {
      parts.push(`(keep ${noncurrentExp.NewerNoncurrentVersions} versions)`)
    }
    return parts.length > 0 ? parts.join(" ") : "–"
  }

  // Helper to format noncurrent version transitions
  const formatNoncurrentTransitions = (transitions: typeof NoncurrentVersionTransitions): string => {
    if (!transitions || transitions.length === 0) return "–"
    return transitions
      .map((t) => {
        const keep = t.NewerNoncurrentVersions !== undefined ? ` (keep ${t.NewerNoncurrentVersions})` : ""
        return `${t.StorageClass} after ${t.NoncurrentDays} days${keep}`
      })
      .join("; ")
  }

  return (
    <div className="overflow-hidden">
      {/* Action Buttons in top-right */}
      <div className="bg-theme-background-lvl-0 flex justify-end gap-2 p-3">
        <Button
          size="small"
          variant="subdued"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEdit()
          }}
          title="Edit"
        >
          <Icon icon="edit" size="24" />
        </Button>
        <Button
          size="small"
          variant="subdued"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
          }}
          title="Delete"
        >
          <Icon icon="deleteForever" size="24" />
        </Button>
      </div>

      {/* Rule Fields in table-like layout */}
      <div>
        {/* Rule ID */}
        <div className="border-theme-default grid grid-cols-[240px_1fr]">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Rule ID</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">{ID || "–"}</div>
        </div>

        {/* Status */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Status</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">{Status}</div>
        </div>

        {/* Filter */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Filter</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm break-all">{formatFilter(Filter, legacyPrefix)}</div>
        </div>

        {/* Expiration */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Expiration</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">{formatExpiration(Expiration)}</div>
        </div>

        {/* Transitions */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Transitions</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">{formatTransitions(Transitions)}</div>
        </div>

        {/* Noncurrent Version Expiration */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Noncurrent Version Expiration</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">
            {formatNoncurrentExpiration(NoncurrentVersionExpiration)}
          </div>
        </div>

        {/* Noncurrent Version Transitions */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Noncurrent Version Transitions</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">
            {formatNoncurrentTransitions(NoncurrentVersionTransitions)}
          </div>
        </div>

        {/* Abort Incomplete Multipart Upload */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Abort Incomplete Uploads</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">
            {AbortIncompleteMultipartUpload ? `After ${AbortIncompleteMultipartUpload.DaysAfterInitiation} days` : "–"}
          </div>
        </div>
      </div>
    </div>
  )
}
