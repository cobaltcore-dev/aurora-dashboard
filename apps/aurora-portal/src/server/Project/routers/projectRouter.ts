import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import type { Project } from "../../../shared/types/models"

const sampleProjects: Project[] = [
  {
    domain_id: "1789d1",
    enabled: true,
    id: "263fd9",
    links: {
      self: "https://example.com/identity/v3/projects/263fd9",
    },
    name: "Test Group",
    description: "Project for testing and development purposes.",
  },
  {
    domain_id: "1789d1",
    enabled: true,
    id: "50ef01",
    links: {
      self: "https://example.com/identity/v3/projects/50ef01",
    },
    name: "Build Group",
    description: "Handles build processes and CI/CD pipelines.",
  },
  {
    domain_id: "1789d1",
    enabled: true,
    id: "89ac3f",
    links: {
      self: "https://example.com/identity/v3/projects/89ac3f",
    },
    name: "Security Group",
    description: "Manages security compliance and access control.",
  },
  {
    domain_id: "1789d1",
    enabled: false,
    id: "a2b4c6",
    links: {
      self: "https://example.com/identity/v3/projects/a2b4c6",
    },
    name: "Archive Group",
    description: "Archived projects, read-only access.",
  },
]

export const projectRouter = {
  list: protectedProcedure.query((): Project[] => {
    return sampleProjects
  }),
}
