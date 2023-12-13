import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '../../../graphql'

const query = gql`
  query fetchSearchUser($query: String!) {
    searchUser(query: $query) {
      id
      name
      email
    }
  }
`

export interface RequestType {
  query: string | undefined
}

export interface QueryType {
  searchUser: UserType[]
}

export interface UserType {
  id: string
  name?: string
  email?: string
  __typename?: 'User'
}

export function useSearchUserQuery(
  request: RequestType,
  options?: QueryHookOptions<QueryType, RequestType>,
) {
  return useQuery<QueryType, RequestType>(query, {
    variables: request,
    skip: !request.query,
    ...options,
  })
}
