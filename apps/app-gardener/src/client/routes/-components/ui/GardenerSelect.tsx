import { Select as HeadlessSelect } from "@headlessui/react"
import { ReactNode } from "react"

export function GardenerSelect({
  children,
  id,
  value,
  name,
  onChange,
  className,
  ...props
}: {
  id?: string
  children: ReactNode
  name?: string // The name of the select element
  value: string | number | undefined // The current value of the select
  onChange: (value: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void // Function to handle value changes
  className?: string
  handleChangeonSubmit?: (event: React.FormEvent<HTMLFieldSetElement>) => void
}) {
  return (
    <HeadlessSelect
      id={id || "default-id"}
      value={value}
      name={name}
      onChange={(event) => onChange(event)}
      className={className}
      {...props}
    >
      {children}
    </HeadlessSelect>
  )
}
