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

export type CatalogItem = {
  __typename?: "CatalogItem"
  /** Endpoints of the catalog item */
  endpoints: Array<Endpoint>
  /** ID of the catalog item */
  id: Scalars["ID"]["output"]
  /** Name of the catalog item */
  name: Scalars["String"]["output"]
  /** Type of the catalog item */
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
  region_id: Scalars["String"]["output"]
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
  logout: Scalars["Boolean"]["output"]
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
  token?: Maybe<Token>
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
  catalog?: Maybe<Array<CatalogItem>>
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
  password_expires_at?: Maybe<Scalars["String"]["output"]>
}

export type GetServersQueryVariables = Exact<{ [key: string]: never }>

export type GetServersQuery = {
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

export type LogoutMutationVariables = Exact<{ [key: string]: never }>

export type LogoutMutation = { __typename?: "Mutation"; logout: boolean }

export type GetTokenQueryVariables = Exact<{ [key: string]: never }>

export type GetTokenQuery = {
  __typename?: "Query"
  token?: {
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
  } | null
}

export const GetServersDocument = gql`
  query GetServers {
    servers {
      id
      name
      description
    }
  }
`

/**
 * __useGetServersQuery__
 *
 * To run a query within a React component, call `useGetServersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetServersQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetServersQuery(baseOptions?: Apollo.QueryHookOptions<GetServersQuery, GetServersQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetServersQuery, GetServersQueryVariables>(GetServersDocument, options)
}
export function useGetServersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetServersQuery, GetServersQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetServersQuery, GetServersQueryVariables>(GetServersDocument, options)
}
export function useGetServersSuspenseQuery(
  baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetServersQuery, GetServersQueryVariables>
) {
  const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetServersQuery, GetServersQueryVariables>(GetServersDocument, options)
}
export type GetServersQueryHookResult = ReturnType<typeof useGetServersQuery>
export type GetServersLazyQueryHookResult = ReturnType<typeof useGetServersLazyQuery>
export type GetServersSuspenseQueryHookResult = ReturnType<typeof useGetServersSuspenseQuery>
export type GetServersQueryResult = Apollo.QueryResult<GetServersQuery, GetServersQueryVariables>
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
export const LogoutDocument = gql`
  mutation Logout {
    logout
  }
`
export type LogoutMutationFn = Apollo.MutationFunction<LogoutMutation, LogoutMutationVariables>

/**
 * __useLogoutMutation__
 *
 * To run a mutation, you first call `useLogoutMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogoutMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logoutMutation, { data, loading, error }] = useLogoutMutation({
 *   variables: {
 *   },
 * });
 */
export function useLogoutMutation(baseOptions?: Apollo.MutationHookOptions<LogoutMutation, LogoutMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useMutation<LogoutMutation, LogoutMutationVariables>(LogoutDocument, options)
}
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>
export type LogoutMutationResult = Apollo.MutationResult<LogoutMutation>
export type LogoutMutationOptions = Apollo.BaseMutationOptions<LogoutMutation, LogoutMutationVariables>
export const GetTokenDocument = gql`
  query GetToken {
    token {
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

/**
 * __useGetTokenQuery__
 *
 * To run a query within a React component, call `useGetTokenQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTokenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTokenQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetTokenQuery(baseOptions?: Apollo.QueryHookOptions<GetTokenQuery, GetTokenQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetTokenQuery, GetTokenQueryVariables>(GetTokenDocument, options)
}
export function useGetTokenLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTokenQuery, GetTokenQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetTokenQuery, GetTokenQueryVariables>(GetTokenDocument, options)
}
export function useGetTokenSuspenseQuery(
  baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTokenQuery, GetTokenQueryVariables>
) {
  const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetTokenQuery, GetTokenQueryVariables>(GetTokenDocument, options)
}
export type GetTokenQueryHookResult = ReturnType<typeof useGetTokenQuery>
export type GetTokenLazyQueryHookResult = ReturnType<typeof useGetTokenLazyQuery>
export type GetTokenSuspenseQueryHookResult = ReturnType<typeof useGetTokenSuspenseQuery>
export type GetTokenQueryResult = Apollo.QueryResult<GetTokenQuery, GetTokenQueryVariables>
