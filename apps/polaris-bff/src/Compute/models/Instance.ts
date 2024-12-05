import { Field, ObjectType, ID } from "type-graphql"

@ObjectType()
class Link {
  @Field(() => String, { description: "The relationship type" })
  rel!: string

  @Field(() => String, { description: "The hyperlink reference" })
  href!: string
}

@ObjectType()
export class Instance {
  constructor({ id, name, links }: { id: string; name: string; links?: { rel: string; href: string }[] }) {
    this.id = id
    this.name = name
    this.links = links
  }

  @Field(() => ID)
  id!: string

  @Field(() => String, { description: "Instance's name" })
  name!: string

  @Field(() => [Link], { nullable: true, description: "Test" })
  links: { rel: string; href: string }[] | undefined
}
