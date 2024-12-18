import { gql } from "@apollo/client"
import * as Apollo from "@apollo/client"
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never }
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never }
const defaultOptions = {} as const
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
}

export type Catalog = {
  __typename?: "Catalog"
  /** Endpoints of the catalog */
  endpoints: Array<Endpoint>
  /** ID of the catalog */
  id: Scalars["String"]["output"]
  /** Name of the catalog */
  name: Scalars["String"]["output"]
  /** Type of the catalog */
  type: Scalars["String"]["output"]
}

export type Domain = {
  __typename?: "Domain"
  /** ID of the user domain */
  id?: Maybe<Scalars["String"]["output"]>
  /** Name of the user domain */
  name?: Maybe<Scalars["String"]["output"]>
}

export type Endpoint = {
  __typename?: "Endpoint"
  /** ID of the endpoint */
  id: Scalars["ID"]["output"]
  /** Interface of the endpoint */
  interface: Scalars["String"]["output"]
  /** Region of the endpoint */
  region: Scalars["String"]["output"]
  /** Region ID of the endpoint */
  regionId: Scalars["String"]["output"]
  /** Url of the endpoint */
  url: Scalars["String"]["output"]
}

export type Link = {
  __typename?: "Link"
  /** The hyperlink reference */
  href: Scalars["String"]["output"]
  /** The relationship type */
  rel: Scalars["String"]["output"]
}

export type Mutation = {
  __typename?: "Mutation"
  login: Token
}

export type MutationLoginArgs = {
  domain: Scalars["String"]["input"]
  password: Scalars["String"]["input"]
  user: Scalars["String"]["input"]
}

export type Project = {
  __typename?: "Project"
  domain: Domain
  /** ID of the project */
  id: Scalars["ID"]["output"]
  /** Name of the project */
  name: Scalars["String"]["output"]
}

export type Query = {
  __typename?: "Query"
  servers: Array<Server>
}

export type Role = {
  __typename?: "Role"
  /** ID of the role */
  id: Scalars["ID"]["output"]
  /** Name of the role */
  name: Scalars["String"]["output"]
}

export type Server = {
  __typename?: "Server"
  /** Server's description */
  description?: Maybe<Scalars["String"]["output"]>
  id: Scalars["ID"]["output"]
  /** Test */
  links?: Maybe<Array<Link>>
  /** Server's name */
  name: Scalars["String"]["output"]
}

export type Token = {
  __typename?: "Token"
  /** Catalog of the token */
  catalog?: Maybe<Catalog>
  /** Domain of the token */
  domain?: Maybe<Domain>
  /** Expiration date of the token */
  expiresAt?: Maybe<Scalars["String"]["output"]>
  /** Project of the token */
  project?: Maybe<Project>
  /** Roles of the token */
  roles?: Maybe<Array<Role>>
  /** User of the token */
  user?: Maybe<User>
}

export type User = {
  __typename?: "User"
  domain: Domain
  /** ID of the user */
  id: Scalars["ID"]["output"]
  /** Name of the user */
  name: Scalars["String"]["output"]
  /** Expiration date of the password */
  passwordExpiresAt?: Maybe<Scalars["String"]["output"]>
}

export type ListServersQueryVariables = Exact<{ [key: string]: never }>

export type ListServersQuery = {
  __typename?: "Query"
  servers: Array<{ __typename?: "Server"; id: string; name: string; description?: string | null }>
}

export type AuthenticationMutationVariables = Exact<{
  domain: Scalars["String"]["input"]
  username: Scalars["String"]["input"]
  password: Scalars["String"]["input"]
}>

export type AuthenticationMutation = {
  __typename?: "Mutation"
  login: {
    __typename?: "Token"
    expiresAt?: string | null
    user?: {
      __typename?: "User"
      name: string
      id: string
      domain: { __typename?: "Domain"; name?: string | null }
    } | null
    project?: { __typename?: "Project"; name: string } | null
    domain?: { __typename?: "Domain"; name?: string | null } | null
  }
}

export const ListServersDocument = gql`
  query listServers {
    servers {
      id
      name
      description
    }
  }
`

/**
 * __useListServersQuery__
 *
 * To run a query within a React component, call `useListServersQuery` and pass it any options that fit your needs.
 * When your component renders, `useListServersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListServersQuery({
 *   variables: {
 *   },
 * });
 */
export function useListServersQuery(
  baseOptions?: Apollo.QueryHookOptions<ListServersQuery, ListServersQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<ListServersQuery, ListServersQueryVariables>(ListServersDocument, options)
}
export function useListServersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<ListServersQuery, ListServersQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<ListServersQuery, ListServersQueryVariables>(ListServersDocument, options)
}
export function useListServersSuspenseQuery(
  baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListServersQuery, ListServersQueryVariables>
) {
  const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<ListServersQuery, ListServersQueryVariables>(ListServersDocument, options)
}
export type ListServersQueryHookResult = ReturnType<typeof useListServersQuery>
export type ListServersLazyQueryHookResult = ReturnType<typeof useListServersLazyQuery>
export type ListServersSuspenseQueryHookResult = ReturnType<typeof useListServersSuspenseQuery>
export type ListServersQueryResult = Apollo.QueryResult<ListServersQuery, ListServersQueryVariables>
export const AuthenticationDocument = gql`
  mutation Authentication($domain: String!, $username: String!, $password: String!) {
    login(domain: $domain, user: $username, password: $password) {
      user {
        name
        id
        domain {
          name
        }
      }
      project {
        name
      }
      domain {
        name
      }
      expiresAt
    }
  }
`
export type AuthenticationMutationFn = Apollo.MutationFunction<AuthenticationMutation, AuthenticationMutationVariables>

/**
 * __useAuthenticationMutation__
 *
 * To run a mutation, you first call `useAuthenticationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAuthenticationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [authenticationMutation, { data, loading, error }] = useAuthenticationMutation({
 *   variables: {
 *      domain: // value for 'domain'
 *      username: // value for 'username'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useAuthenticationMutation(
  baseOptions?: Apollo.MutationHookOptions<AuthenticationMutation, AuthenticationMutationVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<AuthenticationMutation, AuthenticationMutationVariables>(AuthenticationDocument, options)
}
export type AuthenticationMutationHookResult = ReturnType<typeof useAuthenticationMutation>
export type AuthenticationMutationResult = Apollo.MutationResult<AuthenticationMutation>
export type AuthenticationMutationOptions = Apollo.BaseMutationOptions<
  AuthenticationMutation,
  AuthenticationMutationVariables
>
