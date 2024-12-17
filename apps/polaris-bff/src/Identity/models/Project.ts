import { Field, ObjectType, ID } from "type-graphql"
import { Domain } from "./Domain"

@ObjectType()
export class Project {
  @Field(() => Domain, { description: "Domain of the project" })
  domain!: Domain

  @Field(() => Boolean, { description: "Is project enabled?" })
  enabled!: boolean

  @Field(() => ID, { description: "Project ID" })
  id!: string

  @Field(() => String, { description: "Name of the project" })
  name!: string

  @Field(() => String, { nullable: true, description: "Description of the project" })
  description?: string
}
