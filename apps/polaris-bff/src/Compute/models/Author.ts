import { Field, ObjectType, ID } from "type-graphql"

@ObjectType()
export class Author {
  @Field(() => ID)
  id!: string

  @Field(() => String, { description: "Author's first and last name" })
  name!: string

  @Field(() => String, { nullable: true, description: "Author's profile picture" })
  photo?: string
}
