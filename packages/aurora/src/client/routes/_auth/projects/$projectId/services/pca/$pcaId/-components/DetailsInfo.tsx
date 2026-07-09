import { Fragment } from "react"
import {
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  CodeBlock,
} from "@cloudoperators/juno-ui-components/index"

interface DetailsInfoProps {
  basicInfo: ReadonlyArray<{ label: string; value: string | undefined }>
  heading: string
  content: string
}

export const DetailsInfo = ({ basicInfo, heading, content }: DetailsInfoProps) => (
  <Stack gap="4" className="grid grid-cols-2 items-start">
    <DescriptionList alignTerms="right" className="w-full">
      {basicInfo.map(({ label, value }) => (
        <Fragment key={label}>
          <DescriptionTerm>{label}</DescriptionTerm>
          <DescriptionDefinition>{value || "—"}</DescriptionDefinition>
        </Fragment>
      ))}
    </DescriptionList>

    <CodeBlock heading={heading} content={content} className="w-full [&_pre_code]:block [&_pre_code]:w-full" wrap />
  </Stack>
)
