import { Fragment } from "react"
import { DescriptionDefinition, DescriptionList, DescriptionTerm, Stack } from "@cloudoperators/juno-ui-components"

export type DetailListItem = {
  label: string
  value: string
}

interface TwoColumnDescriptionListProps {
  items: DetailListItem[]
}

export const TwoColumnDescriptionList = ({ items }: TwoColumnDescriptionListProps) => {
  const mid = Math.ceil(items.length / 2)
  const firstColumn = items.slice(0, mid)
  const secondColumn = items.slice(mid)

  return (
    <Stack gap="6" className="grid grid-cols-2">
      <DescriptionList alignTerms="right">
        {firstColumn.map(({ label, value }) => (
          <Fragment key={label}>
            <DescriptionTerm>{label}</DescriptionTerm>
            <DescriptionDefinition>{value}</DescriptionDefinition>
          </Fragment>
        ))}
      </DescriptionList>

      <DescriptionList alignTerms="right">
        {secondColumn.map(({ label, value }) => (
          <Fragment key={label}>
            <DescriptionTerm>{label}</DescriptionTerm>
            <DescriptionDefinition>{value}</DescriptionDefinition>
          </Fragment>
        ))}
      </DescriptionList>
    </Stack>
  )
}
