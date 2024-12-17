import { Field, ObjectType, ID } from "type-graphql"

@ObjectType()
class Link {
  @Field(() => String, { description: "The relationship type" })
  rel!: string

  @Field(() => String, { description: "The hyperlink reference" })
  href!: string
}

@ObjectType()
export class Server {
  @Field(() => ID)
  id!: string

  @Field(() => String, { description: "Instance's name" })
  name!: string

  @Field(() => [Link], { nullable: true, description: "Test" })
  links: { rel: string; href: string }[] | undefined
}
