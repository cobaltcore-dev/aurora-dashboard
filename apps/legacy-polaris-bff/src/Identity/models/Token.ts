import { Field, ObjectType, ID } from "type-graphql"

@ObjectType()
class Domain {
  @Field(() => String, { nullable: true, description: "ID of the user domain" })
  id?: string

  @Field(() => String, { nullable: true, description: "Name of the user domain" })
  name?: string
}

@ObjectType()
class User {
  @Field(() => ID, { description: "ID of the user" })
  id!: string

  @Field(() => String, { description: "Name of the user" })
  name!: string

  @Field(() => Domain)
  domain!: Domain

  @Field(() => String, { nullable: true, description: "Expiration date of the password" })
  password_expires_at?: string
}

@ObjectType()
class Project {
  @Field(() => Domain)
  domain!: Domain

  @Field(() => ID, { description: "ID of the project" })
  id!: string

  @Field(() => String, { description: "Name of the project" })
  name!: string
}

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
  region_id!: string
}

@ObjectType()
class CatalogItem {
  @Field(() => [Endpoint], { description: "Endpoints of the catalog item" })
  endpoints: Endpoint[] = []

  @Field(() => String, { description: "Type of the catalog item" })
  type!: string

  @Field(() => ID, { description: "ID of the catalog item" })
  id!: string

  @Field(() => String, { description: "Name of the catalog item" })
  name!: string
}

@ObjectType()
export class Token {
  @Field(() => [CatalogItem], { nullable: true, description: "Catalog of the token" })
  catalog?: CatalogItem[] | null

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
