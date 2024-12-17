import { Field, ObjectType, ID } from "type-graphql"

@ObjectType()
export class Domain {
  @Field(() => ID, { nullable: true, description: "ID of the user domain" })
  id?: string

  @Field(() => String, { nullable: true, description: "Name of the user domain" })
  name?: string

  @Field(() => String, { nullable: true, description: "Description of the user domain" })
  description?: string
}
