import { Trans } from "@lingui/react/macro"
import { Button, Icon } from "@cloudoperators/juno-ui-components"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"

interface CorsRulesViewerProps {
  rules: CorsRuleRead[]
  onAddRule: () => void
  onEditRule: (index: number) => void
  onDeleteRule: (index: number) => void
}

export const CorsRulesViewer = ({ rules, onAddRule, onEditRule, onDeleteRule }: CorsRulesViewerProps) => {
  return (
    <div>
      {/* Description */}
      <p className="text-theme-default mb-4 text-sm">
        <Trans>
          CORS (Cross-Origin Resource Sharing) controls which browser origins can access bucket content via JavaScript.
          Essential for single-page applications, web-based uploads, and cross-domain hosting.
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
  rule: CorsRuleRead
  index: number
  onEdit: () => void
  onDelete: () => void
}

const RuleCard = ({ rule, onEdit, onDelete }: RuleCardProps) => {
  const { ID, AllowedOrigins, AllowedMethods, AllowedHeaders, ExposeHeaders, MaxAgeSeconds } = rule

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

        {/* Allowed Origins */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Allowed Origins</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm break-all">{AllowedOrigins.join(", ")}</div>
        </div>

        {/* Allowed Methods */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Allowed Methods</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">{AllowedMethods.join("   ")}</div>
        </div>

        {/* Allowed Headers */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-1 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Allowed Headers</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">
            {AllowedHeaders && AllowedHeaders.length > 0 ? AllowedHeaders.join(", ") : "–"}
          </div>
        </div>

        {/* Expose Headers */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-2 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Expose Headers</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">
            {ExposeHeaders && ExposeHeaders.length > 0 ? ExposeHeaders.join(", ") : "–"}
          </div>
        </div>

        {/* Max Age */}
        <div className="border-theme-default grid grid-cols-[240px_1fr] border-t">
          <div className="bg-theme-background-lvl-2 text-theme-high px-4 py-2 text-right text-sm font-bold">
            <Trans>Max Age</Trans>
          </div>
          <div className="text-theme-default px-4 py-2 text-sm">
            {MaxAgeSeconds !== undefined ? MaxAgeSeconds : "–"}
          </div>
        </div>
      </div>
    </div>
  )
}
