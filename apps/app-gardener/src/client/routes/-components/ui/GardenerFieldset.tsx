import { Fieldset, Legend } from "@headlessui/react"

import { ReactNode } from "react"

export function GardenerFieldset({
  children,
  className,
  onSubmit,
  ...props
}: {
  children: ReactNode
  className?: string
  legend?: string
  onSubmit?: (event: React.FormEvent<HTMLFieldSetElement>) => void
}) {
  return (
    <Fieldset onSubmit={onSubmit} className="space-y-8">
      <Legend className="text-lg font-semibold text-aurora-gray-900">{props.legend}</Legend>
      <div className={className} {...props}>
        {children}
      </div>
    </Fieldset>
  )
}
