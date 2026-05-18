import { Trans } from "@lingui/react/macro"
import { Tooltip, TooltipTrigger, TooltipContent, Icon } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import type { S3ServiceInfo } from "@/server/Storage/types/ceph"

interface LimitItemProps {
  label: string
  value?: string | number
}

const LimitItem = ({ label, value }: LimitItemProps) => {
  if (value === undefined || value === null) return null
  return (
    <div className="flex items-start gap-1.5">
      <Icon icon="check" size="16px" className="text-theme-success mt-0.5 shrink-0" />
      <span>
        <span className="font-medium">{label}:</span> {value}
      </span>
    </div>
  )
}

const CapabilityItem = ({ label }: { label: string }) => (
  <div className="flex items-start gap-1.5">
    <Icon icon="check" size="16px" className="text-theme-success mt-0.5 shrink-0" />
    <span>{label}</span>
  </div>
)

const Section = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <div className="text-theme-default font-semibold">{title}</div>
    {children}
  </div>
)

type CapabilityKey = keyof S3ServiceInfo["capabilities"]

const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  bucketVersioning: "Bucket versioning",
  bucketPolicies: "Bucket policies",
  bucketACLs: "Bucket ACLs",
  objectACLs: "Object ACLs",
  lifecycleRules: "Lifecycle rules",
  objectExpiration: "Object expiration",
  corsConfiguration: "CORS configuration",
  staticWebsiteHosting: "Static website hosting",
  multipartUpload: "Multipart upload",
  presignedUrls: "Pre-signed URLs (temporary URLs)",
  rangeRequests: "Range requests",
  bucketTagging: "Bucket tagging",
  objectTagging: "Object tagging",
  objectMetadata: "Object metadata",
  serverSideEncryption: "Server-side encryption",
  objectLocking: "Object locking",
  bucketReplication: "Bucket replication",
  serverAccessLogging: "Server access logging",
  eventNotifications: "Event notifications",
} as const

interface LimitConfig {
  key: keyof S3ServiceInfo["limits"]
  label: string
  formatter?: (value: number) => string
}

const LIMIT_CONFIGS: LimitConfig[] = [
  { key: "maxFileSize", label: "Max file size", formatter: formatBytesBinary },
  { key: "maxBucketNameLength", label: "Max bucket name length" },
  { key: "maxObjectNameLength", label: "Max object name length" },
  { key: "bucketListingLimit", label: "Container listing limit", formatter: (v) => v.toLocaleString() },
  { key: "maxDeletesPerRequest", label: "Max deletes per request", formatter: (v) => v.toLocaleString() },
  { key: "maxMultipartParts", label: "Max segments", formatter: (v) => v.toLocaleString() },
  { key: "minMultipartPartSize", label: "Min segment size", formatter: formatBytesBinary },
]

function getEnabledCapabilities(capabilities: S3ServiceInfo["capabilities"]): string[] {
  return (Object.entries(CAPABILITY_LABELS) as [CapabilityKey, string][])
    .filter(([key]) => capabilities[key])
    .map(([, label]) => label)
}

function renderLimitItem(config: LimitConfig, limits: S3ServiceInfo["limits"]) {
  const value = limits[config.key]
  if (value === undefined || value === null) return null

  const formattedValue = config.formatter ? config.formatter(value) : value
  return <LimitItem key={config.key} label={config.label} value={formattedValue} />
}

export const ServiceInfoTooltip = () => {
  const { data: serviceInfo } = trpcReact.storage.ceph.serviceInfo.getServiceInfo.useQuery({})

  if (!serviceInfo) {
    return <Icon icon="info" size="20px" className="text-theme-default" />
  }

  const { limits, capabilities } = serviceInfo

  const capabilityList = getEnabledCapabilities(capabilities)

  return (
    <Tooltip triggerEvent="click" placement="bottom-end">
      <TooltipTrigger asChild>
        <Icon icon="info" size="20px" className="text-theme-light hover:text-theme-default cursor-pointer" />
      </TooltipTrigger>
      <TooltipContent className="z-10 w-72 !p-0 text-sm">
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-3">
          <div className="text-theme-default font-semibold">
            <Trans>Cluster limits and capabilities</Trans>
          </div>

          {/* Limits */}
          <Section title={<Trans>Limits</Trans>}>
            {LIMIT_CONFIGS.map((config) => renderLimitItem(config, limits))}
          </Section>

          {/* Capabilities */}
          {capabilityList.length > 0 && (
            <Section title={<Trans>Capabilities</Trans>}>
              {capabilityList.map((cap) => (
                <CapabilityItem key={cap} label={cap} />
              ))}
            </Section>
          )}

          {/* Footer */}
          {(serviceInfo.version || serviceInfo.region) && (
            <div className="text-theme-light border-t pt-2 text-xs">
              {serviceInfo.version && <span>{serviceInfo.version}</span>}
              {serviceInfo.region && <span className="ml-2">• {serviceInfo.region}</span>}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
