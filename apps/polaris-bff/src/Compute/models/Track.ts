import { Field, ObjectType, ID, Int } from "type-graphql"
import { Author } from "./Author"

@ObjectType()
export class Track {
  @Field(() => ID)
  id!: string

  @Field(() => String, { nullable: true, description: "The track's title" })
  title!: string

  @Field(() => String, { description: "The track's description" })
  description!: string

  @Field(() => Author, { description: "The track's main Author" })
  author!: Author

  @Field(() => String, { nullable: true, description: "The track's illustration" })
  thumbnail?: string

  @Field(() => Int, { nullable: true, description: "The track's approximate length in minutes" })
  length?: number

  @Field(() => Int, { nullable: true, description: "The number of modules this track contains" })
  modulesCount?: number
}
