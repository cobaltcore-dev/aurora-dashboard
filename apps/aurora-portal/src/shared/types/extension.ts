export type ExtensionProps = {
  name: string
  description?: string
  version?: string
  label: string
  icon?: string
  ui?: React.ComponentType
}
export type Extension = {
  register: () => ExtensionProps
}
