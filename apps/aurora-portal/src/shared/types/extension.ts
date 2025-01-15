export type ExtensionProps = {
  name: string
  description?: string
  version?: string
  label: string
  icon?: string
  ui?: React.ComponentType
  router: any
}
export type Extension = {
  register: () => ExtensionProps
}
