import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Button,
  Stack,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Message,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"

interface CorsRulesTableProps {
  rules: CorsRuleRead[]
  onAddRule: () => void
  onEditRule: (index: number) => void
  onDeleteRule: (index: number) => void
  isMutating?: boolean
}

/**
 * Data grid for displaying and managing CORS rules
 *
 * Displays up to 100 rules (S3 limit) in a simple table.
 * No sort/search/filter for v1 — typical configs have 1-3 rules.
 */
export function CorsRulesTable({
  rules,
  onAddRule,
  onEditRule,
  onDeleteRule,
  isMutating = false,
}: CorsRulesTableProps) {
  const { t } = useLingui()

  // Check if any rule uses wildcard origin (security warning)
  const hasWildcardOrigin = rules.some((rule) => rule.AllowedOrigins.includes("*"))

  return (
    <Stack direction="vertical" gap="4">
      {/* Zone 1 — count + add button, no background */}
      <Stack distribution="between" alignment="center" gap="2" className="pb-2">
        <span className="theme-color-text-light text-sm">
          {rules.length} <Trans>rules</Trans>
        </span>

        <Button variant="primary" icon="addCircle" onClick={onAddRule} disabled={isMutating}>
          <Trans>Add rule</Trans>
        </Button>
      </Stack>

      {/* Wildcard origin warning banner */}
      {hasWildcardOrigin && (
        <Message variant="warning" title={t`Wildcard Warning`}>
          <Trans>
            One or more rules use wildcard (*) for AllowedOrigins, which allows any website to access your bucket. Only
            use this for truly public resources.
          </Trans>
        </Message>
      )}

      {/* Rules Table */}
      {rules.length === 0 ? (
        <div className="text-theme-default p-4 text-center text-sm">
          <Trans>There are no CORS rules for this bucket</Trans>
        </div>
      ) : (
        <DataGrid columns={7} className="cors-rules-table">
          <DataGridRow>
            <DataGridHeadCell>{t`Rule ID`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Allowed Origins`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Allowed Methods`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Allowed Headers`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Expose Headers`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Max Age`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Actions`}</DataGridHeadCell>
          </DataGridRow>
          {rules.map((rule, index) => {
            // Rules are keyed by array index - they have no stable server-side id.
            // ID field is optional and may be absent or duplicated.
            // This index identity is the contract with parent's onEditRule(index) / onDeleteRule(index).
            const key = rule.ID ?? index

            return (
              <DataGridRow key={key} data-testid={`cors-rule-row-${index}`}>
                <DataGridCell>{rule.ID || t`—`}</DataGridCell>
                <DataGridCell className="break-all">{rule.AllowedOrigins.join(", ")}</DataGridCell>
                <DataGridCell>{rule.AllowedMethods.join(", ")}</DataGridCell>
                <DataGridCell>
                  {rule.AllowedHeaders && rule.AllowedHeaders.length > 0 ? rule.AllowedHeaders.join(", ") : t`—`}
                </DataGridCell>
                <DataGridCell>
                  {rule.ExposeHeaders && rule.ExposeHeaders.length > 0 ? rule.ExposeHeaders.join(", ") : t`—`}
                </DataGridCell>
                <DataGridCell>{rule.MaxAgeSeconds !== undefined ? rule.MaxAgeSeconds : t`—`}</DataGridCell>
                <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end justify-end pr-0">
                  <PopupMenu>
                    <PopupMenuOptions>
                      <PopupMenuItem label={t`Edit`} onClick={() => onEditRule(index)} disabled={isMutating} />
                      <PopupMenuItem label={t`Delete`} onClick={() => onDeleteRule(index)} disabled={isMutating} />
                    </PopupMenuOptions>
                  </PopupMenu>
                </DataGridCell>
              </DataGridRow>
            )
          })}
        </DataGrid>
      )}
    </Stack>
  )
}
