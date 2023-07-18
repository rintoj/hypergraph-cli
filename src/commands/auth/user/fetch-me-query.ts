import gql from 'graphql-tag'
import { useQuery } from '../../../graphql/use-query'

const query = gql`
  query fetchMe {
    me {
      id
      name
    }
  }
`

export interface QueryType {
  me?: UserType
}

export interface UserType {
  id: string
  name?: string
  __typename?: 'User'
}

export function fetchMe() {
  return useQuery<QueryType, UserType>(query)
}
