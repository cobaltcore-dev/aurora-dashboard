import { Field, ObjectType, ID } from "type-graphql"
import { Domain } from "./Domain"

@ObjectType()
export class User {
  @Field(() => ID, { description: "ID of the user" })
  id!: string

  @Field(() => String, { description: "Name of the user" })
  name!: string

  @Field(() => Domain)
  domain!: Domain

  @Field(() => String, { nullable: true, description: "Expiration date of the password" })
  passwordExpiresAt?: string
}
