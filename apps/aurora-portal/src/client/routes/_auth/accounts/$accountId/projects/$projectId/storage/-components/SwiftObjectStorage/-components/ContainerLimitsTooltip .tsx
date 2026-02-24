import { Trans, useLingui } from "@lingui/react/macro"
import { Tooltip, TooltipTrigger, TooltipContent, Icon } from "@cloudoperators/juno-ui-components"
import { ServiceInfo, AccountInfo } from "@/server/Storage/types/swift"
import { formatBytesBinary } from "@/client/utils/formatBytes"

interface ContainerLimitsTooltipProps {
  serviceInfo?: ServiceInfo
  accountInfo?: AccountInfo
}

interface LimitItemProps {
  label: string
  value?: string | number
}

const LimitItem = ({ label, value }: LimitItemProps) => {
  if (value === undefined || value === null) return null
  return (
    <span className="flex items-start gap-1.5">
      <Icon icon="check" size="16px" className="text-theme-success mt-0.5 shrink-0" />
      <span>
        <span className="font-medium">{label}:</span> {value}
      </span>
    </span>
  )
}

const CapabilityItem = ({ label }: { label: string }) => (
  <span className="flex items-start gap-1.5">
    <Icon icon="check" size="16px" className="text-theme-success mt-0.5 shrink-0" />
    <span>{label}</span>
  </span>
)

const Section = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
  <span className="flex flex-col gap-1.5">
    <span className="text-theme-default block font-semibold">{title}</span>
    {children}
  </span>
)

export const ContainerLimitsTooltip = ({ serviceInfo, accountInfo }: ContainerLimitsTooltipProps) => {
  const { t } = useLingui()

  const swift = serviceInfo?.swift

  const capabilities: string[] = []
  if (swift?.account_quotas) capabilities.push(t`Account quotas`)
  if (swift?.container_quotas) capabilities.push(t`Container quotas`)
  if (swift?.bulk_delete) capabilities.push(t`Efficient bulk deletion`)
  if (swift?.bulk_upload) capabilities.push(t`Bulk upload of archive files`)
  if (swift?.slo) capabilities.push(t`Static large object support`)
  if (swift?.container_sync) capabilities.push(t`Container syncing`)
  if (swift?.tempurl) capabilities.push(t`Temporary URLs`)
  if (swift?.symlink) capabilities.push(t`Symlinks`)
  if (swift?.versioned_writes) capabilities.push(t`Versioned writes`)

  return (
    <div className="relative z-10">
      <Tooltip triggerEvent="hover" placement="bottom-end">
        <TooltipTrigger asChild>
          <Icon icon="info" size="20px" className="text-theme-light hover:text-theme-default cursor-pointer" />
        </TooltipTrigger>
        <TooltipContent className="w-72 text-sm">
          <span className="flex flex-col gap-3 p-1">
            {/* Account stats */}
            {accountInfo && (
              <Section title={<Trans>Account</Trans>}>
                <LimitItem label={t`Containers`} value={accountInfo.containerCount.toLocaleString()} />
                <LimitItem label={t`Objects`} value={accountInfo.objectCount.toLocaleString()} />
                <LimitItem label={t`Used`} value={formatBytesBinary(accountInfo.bytesUsed)} />
                {accountInfo.quotaBytes !== undefined && (
                  <LimitItem label={t`Quota`} value={formatBytesBinary(accountInfo.quotaBytes)} />
                )}
              </Section>
            )}

            {/* Limits */}
            {swift && (
              <Section title={<Trans>Limits</Trans>}>
                <LimitItem
                  label={t`Max file size`}
                  value={swift.max_file_size !== undefined ? formatBytesBinary(swift.max_file_size) : undefined}
                />
                <LimitItem label={t`Max container name length`} value={swift.max_container_name_length} />
                <LimitItem label={t`Max object name length`} value={swift.max_object_name_length} />
                <LimitItem label={t`Container listing limit`} value={swift.container_listing_limit?.toLocaleString()} />
                <LimitItem label={t`Account listing limit`} value={swift.account_listing_limit?.toLocaleString()} />
                <LimitItem label={t`Max header size`} value={swift.max_header_size} />
                <LimitItem label={t`Max meta count`} value={swift.max_meta_count} />
                <LimitItem label={t`Max meta name length`} value={swift.max_meta_name_length} />
                <LimitItem label={t`Max meta value length`} value={swift.max_meta_value_length} />
                <LimitItem label={t`Max meta overall size`} value={swift.max_meta_overall_size} />
                {swift.bulk_delete && (
                  <LimitItem
                    label={t`Max deletes per request`}
                    value={swift.bulk_delete.max_deletes_per_request.toLocaleString()}
                  />
                )}
                {swift.bulk_upload && (
                  <LimitItem
                    label={t`Max containers per extraction`}
                    value={swift.bulk_upload.max_containers_per_extraction.toLocaleString()}
                  />
                )}
                {swift.slo && (
                  <LimitItem label={t`Max SLO segments`} value={swift.slo.max_manifest_segments.toLocaleString()} />
                )}
              </Section>
            )}

            {/* Capabilities */}
            {capabilities.length > 0 && (
              <Section title={<Trans>Capabilities</Trans>}>
                {capabilities.map((cap) => (
                  <CapabilityItem key={cap} label={cap} />
                ))}
              </Section>
            )}
          </span>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
