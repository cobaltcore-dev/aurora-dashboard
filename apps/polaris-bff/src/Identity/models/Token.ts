import { Field, ObjectType, ID } from "type-graphql"
import { Domain } from "./Domain"
import { User } from "./User"
import { Project } from "./Project"

@ObjectType()
class Role {
  @Field(() => ID, { description: "ID of the role" })
  id!: string

  @Field(() => String, { description: "Name of the role" })
  name!: string
}

@ObjectType()
class Endpoint {
  @Field(() => ID, { description: "ID of the endpoint" })
  id!: string

  @Field(() => String, { description: "Url of the endpoint" })
  url!: string

  @Field(() => String, { description: "Region of the endpoint" })
  region!: string

  @Field(() => String, { description: "Interface of the endpoint" })
  interface!: string

  @Field(() => String, { description: "Region ID of the endpoint" })
  regionId!: string
}

@ObjectType()
class Catalog {
  @Field(() => String, { description: "ID of the catalog" })
  id!: string

  @Field(() => String, { description: "Name of the catalog" })
  name!: string

  @Field(() => String, { description: "Type of the catalog" })
  type!: string

  @Field(() => [Endpoint], { description: "Endpoints of the catalog" })
  endpoints!: Endpoint[]
}

@ObjectType()
export class Token {
  @Field(() => Catalog, { nullable: true, description: "Catalog of the token" })
  catalog?: Catalog | null

  @Field(() => String, { nullable: true, description: "Expiration date of the token" })
  expiresAt?: string | null

  @Field(() => Project, { nullable: true, description: "Project of the token" })
  project?: Project | null

  @Field(() => Domain, { nullable: true, description: "Domain of the token" })
  domain?: Domain | null

  @Field(() => [Role], { nullable: true, description: "Roles of the token" })
  roles?: Role[]

  @Field(() => User, { nullable: true, description: "User of the token" })
  user?: User | null
}
