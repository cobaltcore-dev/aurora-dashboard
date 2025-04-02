import { Domain } from "./Authentication/types/models"
import { Project } from "./Project/types/models"

export interface Scope {
  domain: Domain
  project: Project
}
