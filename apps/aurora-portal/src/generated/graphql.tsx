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

export type Author = {
  __typename?: "Author"
  id: Scalars["ID"]["output"]
  /** Author's first and last name */
  name: Scalars["String"]["output"]
  /** Author's profile picture */
  photo?: Maybe<Scalars["String"]["output"]>
}

export type Query = {
  __typename?: "Query"
  tracksForHome: Array<Track>
}

export type Track = {
  __typename?: "Track"
  /** The track's main Author */
  author: Author
  /** The track's description */
  description: Scalars["String"]["output"]
  id: Scalars["ID"]["output"]
  /** The track's approximate length in minutes */
  length?: Maybe<Scalars["Int"]["output"]>
  /** The number of modules this track contains */
  modulesCount?: Maybe<Scalars["Int"]["output"]>
  /** The track's illustration */
  thumbnail?: Maybe<Scalars["String"]["output"]>
  /** The track's title */
  title?: Maybe<Scalars["String"]["output"]>
}

export type GetTracksQueryVariables = Exact<{ [key: string]: never }>

export type GetTracksQuery = {
  __typename?: "Query"
  tracksForHome: Array<{
    __typename?: "Track"
    id: string
    title?: string | null
    length?: number | null
    modulesCount?: number | null
    author: { __typename?: "Author"; name: string }
  }>
}

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
`

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
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useQuery<GetTracksQuery, GetTracksQueryVariables>(GetTracksDocument, options)
}
export function useGetTracksLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetTracksQuery, GetTracksQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions }
  return Apollo.useLazyQuery<GetTracksQuery, GetTracksQueryVariables>(GetTracksDocument, options)
}
export function useGetTracksSuspenseQuery(
  baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTracksQuery, GetTracksQueryVariables>
) {
  const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions }
  return Apollo.useSuspenseQuery<GetTracksQuery, GetTracksQueryVariables>(GetTracksDocument, options)
}
export type GetTracksQueryHookResult = ReturnType<typeof useGetTracksQuery>
export type GetTracksLazyQueryHookResult = ReturnType<typeof useGetTracksLazyQuery>
export type GetTracksSuspenseQueryHookResult = ReturnType<typeof useGetTracksSuspenseQuery>
export type GetTracksQueryResult = Apollo.QueryResult<GetTracksQuery, GetTracksQueryVariables>
