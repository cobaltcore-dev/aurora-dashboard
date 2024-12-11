import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Author = {
  __typename?: 'Author';
  id: Scalars['ID']['output'];
  /** Author's first and last name */
  name: Scalars['String']['output'];
  /** Author's profile picture */
  photo?: Maybe<Scalars['String']['output']>;
};

export type Catalog = {
  __typename?: 'Catalog';
  /** Endpoints of the catalog */
  endpoints: Array<Endpoint>;
  /** ID of the catalog */
  id: Scalars['String']['output'];
  /** Name of the catalog */
  name: Scalars['String']['output'];
  /** Type of the catalog */
  type: Scalars['String']['output'];
};

export type Domain = {
  __typename?: 'Domain';
  /** ID of the user domain */
  id?: Maybe<Scalars['String']['output']>;
  /** Name of the user domain */
  name?: Maybe<Scalars['String']['output']>;
};

export type Endpoint = {
  __typename?: 'Endpoint';
  /** ID of the endpoint */
  id: Scalars['ID']['output'];
  /** Interface of the endpoint */
  interface: Scalars['String']['output'];
  /** Region of the endpoint */
  region: Scalars['String']['output'];
  /** Region ID of the endpoint */
  regionId: Scalars['String']['output'];
  /** Url of the endpoint */
  url: Scalars['String']['output'];
};

export type Instance = {
  __typename?: 'Instance';
  id: Scalars['ID']['output'];
  /** Test */
  links?: Maybe<Array<Link>>;
  /** Instance's name */
  name: Scalars['String']['output'];
};

export type Link = {
  __typename?: 'Link';
  /** The hyperlink reference */
  href: Scalars['String']['output'];
  /** The relationship type */
  rel: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  authenticate: Token;
};


export type MutationAuthenticateArgs = {
  domain: Scalars['String']['input'];
  password: Scalars['String']['input'];
  user: Scalars['String']['input'];
};

export type Project = {
  __typename?: 'Project';
  domain: Domain;
  /** ID of the project */
  id: Scalars['ID']['output'];
  /** Name of the project */
  name: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  instances: Array<Instance>;
  tracksForHome: Array<Track>;
};

export type Role = {
  __typename?: 'Role';
  /** ID of the role */
  id: Scalars['ID']['output'];
  /** Name of the role */
  name: Scalars['String']['output'];
};

export type Token = {
  __typename?: 'Token';
  /** The authentication token, which is used for all API communications. */
  authToken?: Maybe<Scalars['String']['output']>;
  /** Catalog of the token */
  catalog?: Maybe<Catalog>;
  /** Domain of the token */
  domain?: Maybe<Domain>;
  /** Expiration date of the token */
  expiresAt?: Maybe<Scalars['String']['output']>;
  /** Project of the token */
  project?: Maybe<Project>;
  /** Roles of the token */
  roles?: Maybe<Array<Role>>;
  /** User of the token */
  user?: Maybe<User>;
};

export type Track = {
  __typename?: 'Track';
  /** The track's main Author */
  author: Author;
  /** The track's description */
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** The track's approximate length in minutes */
  length?: Maybe<Scalars['Int']['output']>;
  /** The number of modules this track contains */
  modulesCount?: Maybe<Scalars['Int']['output']>;
  /** The track's illustration */
  thumbnail?: Maybe<Scalars['String']['output']>;
  /** The track's title */
  title?: Maybe<Scalars['String']['output']>;
};

export type User = {
  __typename?: 'User';
  domain: Domain;
  /** ID of the user */
  id: Scalars['ID']['output'];
  /** Name of the user */
  name: Scalars['String']['output'];
  /** Expiration date of the password */
  passwordExpiresAt?: Maybe<Scalars['String']['output']>;
};

export type GetTracksQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTracksQuery = { __typename?: 'Query', tracksForHome: Array<{ __typename?: 'Track', id: string, title?: string | null, length?: number | null, modulesCount?: number | null, author: { __typename?: 'Author', name: string } }> };

export type AuthenticationMutationVariables = Exact<{
  domain: Scalars['String']['input'];
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type AuthenticationMutation = { __typename?: 'Mutation', authenticate: { __typename?: 'Token', expiresAt?: string | null, authToken?: string | null, user?: { __typename?: 'User', name: string, id: string, domain: { __typename?: 'Domain', name?: string | null } } | null, project?: { __typename?: 'Project', name: string } | null, domain?: { __typename?: 'Domain', name?: string | null } | null } };


export const GetTracksDocument = gql`
    query GetTracks {
  tracksForHome {
    id
    title
    author {
      name
    }
    length
    modulesCount
  }
}
    `;

/**
 * __useGetTracksQuery__
 *
 * To run a query within a React component, call `useGetTracksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTracksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTracksQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetTracksQuery(baseOptions?: Apollo.QueryHookOptions<GetTracksQuery, GetTracksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTracksQuery, GetTracksQueryVariables>(GetTracksDocument, options);
      }
export function useGetTracksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTracksQuery, GetTracksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTracksQuery, GetTracksQueryVariables>(GetTracksDocument, options);
        }
export function useGetTracksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTracksQuery, GetTracksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTracksQuery, GetTracksQueryVariables>(GetTracksDocument, options);
        }
export type GetTracksQueryHookResult = ReturnType<typeof useGetTracksQuery>;
export type GetTracksLazyQueryHookResult = ReturnType<typeof useGetTracksLazyQuery>;
export type GetTracksSuspenseQueryHookResult = ReturnType<typeof useGetTracksSuspenseQuery>;
export type GetTracksQueryResult = Apollo.QueryResult<GetTracksQuery, GetTracksQueryVariables>;
export const AuthenticationDocument = gql`
    mutation Authentication($domain: String!, $username: String!, $password: String!) {
  authenticate(domain: $domain, user: $username, password: $password) {
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
    authToken
  }
}
    `;
export type AuthenticationMutationFn = Apollo.MutationFunction<AuthenticationMutation, AuthenticationMutationVariables>;

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
export function useAuthenticationMutation(baseOptions?: Apollo.MutationHookOptions<AuthenticationMutation, AuthenticationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AuthenticationMutation, AuthenticationMutationVariables>(AuthenticationDocument, options);
      }
export type AuthenticationMutationHookResult = ReturnType<typeof useAuthenticationMutation>;
export type AuthenticationMutationResult = Apollo.MutationResult<AuthenticationMutation>;
export type AuthenticationMutationOptions = Apollo.BaseMutationOptions<AuthenticationMutation, AuthenticationMutationVariables>;