import { useLingui } from "@lingui/react/macro"
import { CodeBlock, Stack } from "@cloudoperators/juno-ui-components"
import { getCliSnippets, type CliPrerequisiteId, type CliStepId, type CliTool } from "./cliSetupSnippets"

interface CliToolInstructionsProps {
  tool: CliTool
  endpoint: string
  region: string
  bucketName?: string
}

/** Prerequisites and numbered, copyable steps for one CLI tool, filled in from the connection details. */
export const CliToolInstructions = ({ tool, endpoint, region, bucketName }: CliToolInstructionsProps) => {
  const { t } = useLingui()
  const { prerequisites, steps } = getCliSnippets(tool, { endpoint, region, bucketName })

  const prerequisiteLabel = (id: CliPrerequisiteId): string => {
    switch (id) {
      case "installTool":
        switch (tool) {
          case "aws-cli":
            return t`Install AWS CLI v2`
          case "s3cmd":
            return t`Install s3cmd`
          case "rclone":
            return t`Install rclone`
        }
        break
      case "accessKey":
        return t`An access key ID and secret access key (see Manage Credentials)`
    }
  }

  const stepLabel = (id: CliStepId): string => {
    switch (id) {
      case "createProfile":
        return t`Create a profile. Enter the access key ID and secret access key when prompted.`
      case "configureProfile":
        return t`Set the region and path-style addressing for the profile.`
      case "writeConfig":
        return tool === "s3cmd"
          ? t`Save this configuration as ~/.s3cfg and replace the placeholders with the access key ID and secret access key.`
          : t`Add this configuration to rclone.conf (run "rclone config file" to find it) and replace the placeholders with the access key ID and secret access key.`
      case "listBuckets":
        return t`List buckets.`
      case "listObjects":
        return t`List objects in the bucket.`
      case "upload":
        return t`Upload a file.`
      case "download":
        return t`Download an object.`
    }
  }

  return (
    <Stack direction="vertical" gap="4">
      <p className="font-bold">{t`Prerequisites`}</p>
      <ul className="list-disc pl-6">
        {prerequisites.map((id) => (
          <li key={id}>{prerequisiteLabel(id)}</li>
        ))}
      </ul>
      <ol className="list-decimal space-y-4 pl-6">
        {steps.map((step) => (
          <li key={step.id}>
            <p className="mb-2">{stepLabel(step.id)}</p>
            <CodeBlock content={step.code} data-testid={`cli-step-${step.id}`} />
          </li>
        ))}
      </ol>
    </Stack>
  )
}
