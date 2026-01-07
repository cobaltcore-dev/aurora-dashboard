import { Domain } from "./Authentication/types/models"
import { Project } from "./Project/types/models"

export interface Scope {
  domain: Domain
  project: Project
}

export interface UploadedFile {
  filename: string
  mimetype: string
  buffer: Buffer<ArrayBufferLike>
}

export interface FormFields {
  [key: string]: unknown
}

declare module "fastify" {
  interface FastifyRequest {
    uploadedFile?: UploadedFile
    formFields?: FormFields
  }
}
