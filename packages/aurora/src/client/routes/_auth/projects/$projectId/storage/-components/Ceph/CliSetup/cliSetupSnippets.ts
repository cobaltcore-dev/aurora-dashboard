/**
 * Builds the copy-ready CLI configuration shown in the CLI Setup Guide.
 *
 * Credentials are always placeholders; no secret ever enters this module. Path-style addressing
 * mirrors `server/Storage/clients/s3Client.ts` (`forcePathStyle: true`): the AWS CLI is told so
 * explicitly, s3cmd uses it when `host_bucket` has no `%(bucket)s`, and rclone's
 * `force_path_style` defaults to `true`. s3cmd's `host_base` takes a host only, so any endpoint
 * path is dropped for it.
 *
 * Juno `CodeBlock` copies its `textContent`, so every `code` string must stay runnable as-is: no
 * `$ ` prompt, no sample output.
 *
 * A bucket name is pasted into commands the user runs, and existing buckets may have any name
 * (Swift API, relaxed RGW rules - see `existingBucketNameSchema`), so only a name matching
 * `SAFE_BUCKET_NAME` is filled in; any other keeps `<bucket-name>`.
 */

export const CLI_TOOLS = ["aws-cli", "s3cmd", "rclone"] as const
export type CliTool = (typeof CLI_TOOLS)[number]
export const DEFAULT_CLI_TOOL: CliTool = "aws-cli"

export const isCliTool = (value: unknown): value is CliTool =>
  typeof value === "string" && (CLI_TOOLS as readonly string[]).includes(value)

// Product names, not translated.
export const CLI_TOOL_LABELS: Record<CliTool, string> = {
  "aws-cli": "AWS CLI",
  s3cmd: "s3cmd",
  rclone: "rclone",
}

// AWS CLI profile and rclone remote name.
export const CLI_PROFILE_NAME = "ceph"

export const ACCESS_KEY_PLACEHOLDER = "<ACCESS_KEY_ID>"
export const SECRET_KEY_PLACEHOLDER = "<SECRET_ACCESS_KEY>"
export const BUCKET_PLACEHOLDER = "<bucket-name>"
export const LOCAL_FILE_PLACEHOLDER = "<local-file>"
export const OBJECT_KEY_PLACEHOLDER = "<object-key>"

const SAFE_BUCKET_NAME = /^[A-Za-z0-9._-]{1,255}$/

export type CliPrerequisiteId = "installTool" | "accessKey"
export type CliStepId =
  "createProfile" | "configureProfile" | "writeConfig" | "listBuckets" | "listObjects" | "upload" | "download"

export interface CliStep {
  id: CliStepId
  code: string
}

export interface CliSnippets {
  prerequisites: CliPrerequisiteId[]
  steps: CliStep[]
}

export function endpointParts(endpoint: string): { host: string; useHttps: boolean } {
  try {
    const url = new URL(endpoint)
    return { host: url.host, useHttps: url.protocol === "https:" }
  } catch {
    const host = endpoint.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split("/")[0]
    return { host, useHttps: !endpoint.startsWith("http://") }
  }
}

export function getCliSnippets(
  tool: CliTool,
  opts: { endpoint: string; region: string; bucketName?: string }
): CliSnippets {
  const { region } = opts
  const ep = opts.endpoint
  const p = CLI_PROFILE_NAME
  const hasBucket = !!opts.bucketName && SAFE_BUCKET_NAME.test(opts.bucketName)
  const bucket = hasBucket ? (opts.bucketName as string) : BUCKET_PLACEHOLDER
  const prerequisites: CliPrerequisiteId[] = ["installTool", "accessKey"]

  switch (tool) {
    case "aws-cli": {
      const common = `--profile ${p} --endpoint-url ${ep}`
      const list: CliStep = hasBucket
        ? { id: "listObjects", code: `aws s3 ls s3://${bucket}/ ${common}` }
        : { id: "listBuckets", code: `aws s3 ls ${common}` }
      return {
        prerequisites,
        steps: [
          { id: "createProfile", code: `aws configure --profile ${p}` },
          {
            id: "configureProfile",
            code: [
              `aws configure set region ${region} --profile ${p}`,
              `aws configure set s3.addressing_style path --profile ${p}`,
            ].join("\n"),
          },
          list,
          { id: "upload", code: `aws s3 cp ${LOCAL_FILE_PLACEHOLDER} s3://${bucket}/ ${common}` },
          { id: "download", code: `aws s3 cp s3://${bucket}/${OBJECT_KEY_PLACEHOLDER} . ${common}` },
        ],
      }
    }
    case "s3cmd": {
      const { host, useHttps } = endpointParts(ep)
      return {
        prerequisites,
        steps: [
          {
            id: "writeConfig",
            code: [
              "[default]",
              `access_key = ${ACCESS_KEY_PLACEHOLDER}`,
              `secret_key = ${SECRET_KEY_PLACEHOLDER}`,
              `host_base = ${host}`,
              `host_bucket = ${host}`,
              `bucket_location = ${region}`,
              `use_https = ${useHttps ? "True" : "False"}`,
              "signature_v2 = False",
            ].join("\n"),
          },
          hasBucket ? { id: "listObjects", code: `s3cmd ls s3://${bucket}` } : { id: "listBuckets", code: "s3cmd ls" },
          { id: "upload", code: `s3cmd put ${LOCAL_FILE_PLACEHOLDER} s3://${bucket}/` },
          { id: "download", code: `s3cmd get s3://${bucket}/${OBJECT_KEY_PLACEHOLDER}` },
        ],
      }
    }
    case "rclone":
      return {
        prerequisites,
        steps: [
          {
            id: "writeConfig",
            code: [
              `[${p}]`,
              "type = s3",
              "provider = Ceph",
              `access_key_id = ${ACCESS_KEY_PLACEHOLDER}`,
              `secret_access_key = ${SECRET_KEY_PLACEHOLDER}`,
              `endpoint = ${ep}`,
              `region = ${region}`,
            ].join("\n"),
          },
          hasBucket
            ? { id: "listObjects", code: `rclone ls ${p}:${bucket}` }
            : { id: "listBuckets", code: `rclone lsd ${p}:` },
          { id: "upload", code: `rclone copy ${LOCAL_FILE_PLACEHOLDER} ${p}:${bucket}/` },
          { id: "download", code: `rclone copy ${p}:${bucket}/${OBJECT_KEY_PLACEHOLDER} .` },
        ],
      }
  }
}
