import { Fragment } from "react"
import { DescriptionList, DescriptionTerm, DescriptionDefinition } from "@cloudoperators/juno-ui-components"

export function Metadata({ value }: { value: Record<string, string> | null | undefined }) {
  const entries = Object.entries(value ?? {})
  if (!entries.length) return <>- -</>
  return (
    <DescriptionList>
      {entries.map(([key, text]) => (
        <Fragment key={key}>
          <DescriptionTerm>{key}</DescriptionTerm>
          <DescriptionDefinition>{text || "- -"}</DescriptionDefinition>
        </Fragment>
      ))}
    </DescriptionList>
  )
}
