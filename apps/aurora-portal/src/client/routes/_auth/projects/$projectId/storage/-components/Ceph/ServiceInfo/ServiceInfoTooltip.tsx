import { Trans, useLingui } from "@lingui/react/macro"
import { Tooltip, TooltipTrigger, TooltipContent, Icon } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { formatBytesBinary } from "@/client/utils/formatBytes"

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

export const ServiceInfoTooltip = () => {
  const { t } = useLingui()

  const { data: serviceInfo } = trpcReact.storage.ceph.serviceInfo.getServiceInfo.useQuery({})

  if (!serviceInfo) {
    return <Icon icon="info" size="20px" className="text-theme-light" />
  }

  const limits = serviceInfo.limits
  const capabilities = serviceInfo.capabilities

  // Build capabilities list - only show enabled ones
  const capabilityList: string[] = []

  if (capabilities.bucketVersioning) capabilityList.push(t`Bucket versioning`)
  if (capabilities.bucketPolicies) capabilityList.push(t`Bucket policies`)
  if (capabilities.bucketACLs) capabilityList.push(t`Bucket ACLs`)
  if (capabilities.objectACLs) capabilityList.push(t`Object ACLs`)
  if (capabilities.lifecycleRules) capabilityList.push(t`Lifecycle rules`)
  if (capabilities.objectExpiration) capabilityList.push(t`Object expiration`)
  if (capabilities.corsConfiguration) capabilityList.push(t`CORS configuration`)
  if (capabilities.staticWebsiteHosting) capabilityList.push(t`Static website hosting`)
  if (capabilities.multipartUpload) capabilityList.push(t`Multipart upload`)
  if (capabilities.presignedUrls) capabilityList.push(t`Pre-signed URLs (temporary URLs)`)
  if (capabilities.rangeRequests) capabilityList.push(t`Range requests`)
  if (capabilities.bucketTagging) capabilityList.push(t`Bucket tagging`)
  if (capabilities.objectTagging) capabilityList.push(t`Object tagging`)
  if (capabilities.objectMetadata) capabilityList.push(t`Object metadata`)
  if (capabilities.serverSideEncryption) capabilityList.push(t`Server-side encryption`)

  return (
    <Tooltip triggerEvent="hover" placement="bottom-end">
      <TooltipTrigger asChild>
        <Icon icon="info" size="20px" className="text-theme-light hover:text-theme-default cursor-pointer" />
      </TooltipTrigger>
      <TooltipContent className="z-10 w-72 max-h-[80vh] overflow-y-auto text-sm">
        <span className="flex flex-col gap-3 p-1">
          <span className="text-theme-default font-semibold">
            <Trans>Cluster limits and capabilities</Trans>
          </span>

          {/* Limits */}
          <Section title={<Trans>Limits</Trans>}>
            <LimitItem
              label={t`Max file size`}
              value={limits.maxFileSize !== undefined ? formatBytesBinary(limits.maxFileSize) : undefined}
            />
            <LimitItem label={t`Max bucket name length`} value={limits.maxBucketNameLength} />
            <LimitItem label={t`Max object name length`} value={limits.maxObjectNameLength} />
            <LimitItem label={t`Container listing limit`} value={limits.bucketListingLimit?.toLocaleString()} />
            <LimitItem label={t`Max deletes per request`} value={limits.maxDeletesPerRequest?.toLocaleString()} />
            <LimitItem label={t`Max segments`} value={limits.maxMultipartParts?.toLocaleString()} />
            <LimitItem
              label={t`Min segment size`}
              value={
                limits.minMultipartPartSize !== undefined ? formatBytesBinary(limits.minMultipartPartSize) : undefined
              }
            />
          </Section>

          {/* Capabilities */}
          {capabilityList.length > 0 && (
            <Section title={<Trans>Capabilities</Trans>}>
              {capabilityList.map((cap) => (
                <CapabilityItem key={cap} label={cap} />
              ))}
            </Section>
          )}

          {/* Footer note */}
          <span className="text-theme-light border-t pt-2 text-xs">
            {serviceInfo.version && <span>{serviceInfo.version}</span>}
            {serviceInfo.region && <span className="ml-2">• {serviceInfo.region}</span>}
          </span>
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
