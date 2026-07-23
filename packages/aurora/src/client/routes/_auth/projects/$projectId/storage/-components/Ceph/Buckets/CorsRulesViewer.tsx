import { Trans } from "@lingui/react/macro"
import { Panel, PanelBody, Button, Message, Stack } from "@cloudoperators/juno-ui-components"
import type { CorsRule } from "@/server/Storage/types/ceph"

interface CorsRulesViewerProps {
  rules: CorsRule[]
  onAddRule: () => void
  onEditRule: (index: number) => void
  onDeleteRule: (index: number) => void
  onDeleteAllRules: () => void
}

export const CorsRulesViewer = ({
  rules,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onDeleteAllRules,
}: CorsRulesViewerProps) => {
  const hasWildcardOrigin = rules.some((rule) => rule.AllowedOrigins.includes("*"))

  return (
    <div>
      {/* Summary Panel */}
      <Panel className="mb-4">
        <PanelBody>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-theme-high mb-1 text-base font-semibold">
                <Trans>Current Configuration</Trans>
              </h3>
              <p className="text-theme-light text-sm">
                {rules.length === 0 ? (
                  <Trans>No CORS rules configured on this bucket</Trans>
                ) : (
                  <Trans>
                    {rules.length} {rules.length === 1 ? "rule" : "rules"} configured
                  </Trans>
                )}
              </p>
            </div>
            {rules.length === 0 ? (
              <Button size="small" variant="primary" onClick={onAddRule}>
                <Trans>Add First Rule</Trans>
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="small" variant="subdued" onClick={onAddRule}>
                  <Trans>Add Rule</Trans>
                </Button>
              </div>
            )}
          </div>
        </PanelBody>
      </Panel>

      {/* Global Security Warning */}
      {hasWildcardOrigin && (
        <Message variant="warning" title="Security Warning" className="mb-4">
          <Trans>
            One or more rules use wildcard (*) for AllowedOrigins, which allows any website to access your bucket. Only
            use this for truly public resources.
          </Trans>
        </Message>
      )}

      {/* Help Text */}
      <div className="mb-4">
        <p className="text-theme-default mb-2 text-sm">
          <Trans>
            CORS (Cross-Origin Resource Sharing) controls which browser origins can access bucket content via
            JavaScript.
          </Trans>
        </p>
        <p className="text-theme-light text-sm">
          <Trans>Essential for single-page applications, web-based uploads, and cross-domain hosting.</Trans>
        </p>
      </div>

      {/* Current Rules List */}
      {rules.length > 0 && (
        <div>
          <h3 className="text-theme-high mb-3 text-base font-semibold">
            <Trans>Rules Details</Trans>
          </h3>
          <div className="space-y-4">
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
      )}

      {/* Actions for View Tab */}
      {rules.length > 0 && (
        <div className="border-theme-default mt-4 flex items-center justify-between border-t pt-4">
          <Button size="small" variant="primary-danger" onClick={onDeleteAllRules}>
            <Trans>Delete All Rules</Trans>
          </Button>
          <Button size="small" variant="primary" onClick={onAddRule}>
            <Trans>Add Another Rule</Trans>
          </Button>
        </div>
      )}
    </div>
  )
}

interface RuleCardProps {
  rule: CorsRule
  index: number
  onEdit: () => void
  onDelete: () => void
}

const RuleCard = ({ rule, index, onEdit, onDelete }: RuleCardProps) => {
  const { ID, AllowedOrigins, AllowedMethods, AllowedHeaders, ExposeHeaders, MaxAgeSeconds } = rule
  const hasWildcard = AllowedOrigins.includes("*")

  return (
    <div className="border-theme-default bg-theme-background-lvl-1 rounded border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Rule Header */}
          <div className="border-theme-default mb-4 flex items-center gap-2 border-b pb-3">
            <span className="text-theme-high text-base font-medium">{ID || <Trans>Rule {index + 1}</Trans>}</span>
            {hasWildcard && (
              <span className="bg-theme-warning/20 text-theme-warning rounded px-2 py-0.5 text-xs font-medium">
                ⚠️ Wildcard
              </span>
            )}
          </div>

          {/* Using grid layout instead of DescriptionList for better control */}
          <div className="space-y-3">
            {/* Allowed Origins */}
            <div>
              <div className="text-theme-high mb-1.5 text-sm font-medium">
                <Trans>Allowed Origins</Trans>
              </div>
              <div className="bg-theme-background-lvl-2 border-theme-default rounded border p-2">
                {AllowedOrigins.map((origin, i) => (
                  <div key={i} className="text-theme-default py-0.5 font-mono text-xs">
                    {origin === "*" ? <span className="text-theme-warning font-semibold">{origin}</span> : origin}
                  </div>
                ))}
              </div>
            </div>

            {/* Allowed Methods */}
            <div>
              <div className="text-theme-high mb-1.5 text-sm font-medium">
                <Trans>Allowed Methods</Trans>
              </div>
              <Stack gap="2" wrap={true}>
                {AllowedMethods.map((method) => (
                  <span
                    key={method}
                    className="bg-theme-accent/20 text-theme-accent rounded px-2 py-1 font-mono text-xs font-medium"
                  >
                    {method}
                  </span>
                ))}
              </Stack>
            </div>

            {/* Allowed Headers - Only show if present */}
            {AllowedHeaders && AllowedHeaders.length > 0 && (
              <div>
                <div className="text-theme-high mb-1.5 text-sm font-medium">
                  <Trans>Allowed Headers</Trans>
                </div>
                <div className="bg-theme-background-lvl-2 border-theme-default rounded border p-2">
                  <div className="text-theme-default font-mono text-xs">{AllowedHeaders.join(", ")}</div>
                </div>
              </div>
            )}

            {/* Expose Headers - Only show if present */}
            {ExposeHeaders && ExposeHeaders.length > 0 && (
              <div>
                <div className="text-theme-high mb-1.5 text-sm font-medium">
                  <Trans>Expose Headers</Trans>
                </div>
                <div className="bg-theme-background-lvl-2 border-theme-default rounded border p-2">
                  <div className="text-theme-default font-mono text-xs">{ExposeHeaders.join(", ")}</div>
                </div>
              </div>
            )}

            {/* Max Age - Only show if present */}
            {MaxAgeSeconds !== undefined && (
              <div>
                <div className="text-theme-high mb-1.5 text-sm font-medium">
                  <Trans>Max Age</Trans>
                </div>
                <div className="text-theme-default text-sm">
                  <span className="font-mono font-medium">{MaxAgeSeconds}</span>{" "}
                  <span className="text-theme-light">seconds</span>
                  {MaxAgeSeconds >= 60 && (
                    <span className="text-theme-light ml-1">
                      ({Math.floor(MaxAgeSeconds / 60)} {MaxAgeSeconds >= 120 ? "minutes" : "minute"})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button size="small" variant="subdued" onClick={onEdit}>
            <Trans>Edit</Trans>
          </Button>
          <Button size="small" variant="primary-danger" onClick={onDelete}>
            <Trans>Delete</Trans>
          </Button>
        </div>
      </div>
    </div>
  )
}
