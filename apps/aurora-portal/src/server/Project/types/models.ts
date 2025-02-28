export type Project = {
  domain_id: string
  enabled: boolean
  id: string
  links: {
    self: string
  }
  name: string
  description: string
}

export type ProjectsResponse = {
  projects: Project[]
  links: {
    self: string
    previous: string | null
    next: string | null
  }
}
