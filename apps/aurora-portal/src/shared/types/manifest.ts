export type Navigation = {
  icon: string
  label: string
  route: string
}

export type Module = {
  name: string
  type: string // You can use literal types like "core" if the type is always "core".
  navigation: Navigation
}

// Example array type
export type Manifest = Module[]
