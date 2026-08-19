import { Fragment } from "react"
import {
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  CodeBlock,
  Icon,
} from "@cloudoperators/juno-ui-components/index"

interface DetailsInfoProps {
  basicInfo: ReadonlyArray<{ label: string; value: string | undefined }>
  heading: string
  content: string
  fileName: string
}

export const DetailsInfo = ({ basicInfo, heading, content, fileName }: DetailsInfoProps) => {
  const downloadPem = () => {
    const url = URL.createObjectURL(new Blob([content], { type: "application/x-pem-file" }))
    const link = document.createElement("a")

    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Stack gap="4" className="grid grid-cols-2 items-start">
      <DescriptionList alignTerms="right" className="w-full">
        {basicInfo.map(({ label, value }) => (
          <Fragment key={label}>
            <DescriptionTerm>{label}</DescriptionTerm>
            <DescriptionDefinition>{value || "—"}</DescriptionDefinition>
          </Fragment>
        ))}
      </DescriptionList>

      <CodeBlock
        heading={heading}
        content={content}
        className="w-full [&_pre_code]:block [&_pre_code]:w-full"
        wrap
        codeBlockFooter={<Icon icon="download" title="Download PEM file" onClick={downloadPem} disabled={!content} />}
      />
    </Stack>
  )
}
