import { Fragment, type ReactNode } from "react"
import { DescriptionDefinition, DescriptionList, DescriptionTerm, Stack } from "@cloudoperators/juno-ui-components"

export type DetailListItem = {
  id?: string
  label: string | ReactNode
  value: string | number | ReactNode | undefined
}

interface TwoColumnDescriptionListProps {
  items: DetailListItem[]
}

export const TwoColumnDescriptionList = ({ items }: TwoColumnDescriptionListProps) => {
  const mid = Math.ceil(items.length / 2)
  const firstColumn = items.slice(0, mid)
  const secondColumn = items.slice(mid)

  return (
    // alignment="start": the default stretch would pull the shorter column down to the taller one's height
    <Stack gap="6" alignment="start">
      {/* flex-1 splits the row into equal columns; min-w-0 lets long values truncate instead of widening their column */}
      <DescriptionList alignTerms="right" className="min-w-0 flex-1">
        {firstColumn.map(({ id, label, value }, index) => (
          <Fragment key={id ?? `left-${index}`}>
            <DescriptionTerm>{label}</DescriptionTerm>
            <DescriptionDefinition>
              <div className="truncate">{value}</div>
            </DescriptionDefinition>
          </Fragment>
        ))}
      </DescriptionList>

      <DescriptionList alignTerms="right" className="min-w-0 flex-1">
        {secondColumn.map(({ id, label, value }, index) => (
          <Fragment key={id ?? `right-${index}`}>
            <DescriptionTerm>{label}</DescriptionTerm>
            <DescriptionDefinition>
              <div className="truncate">{value}</div>
            </DescriptionDefinition>
          </Fragment>
        ))}
      </DescriptionList>
    </Stack>
  )
}
