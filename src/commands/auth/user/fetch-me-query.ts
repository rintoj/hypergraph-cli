import gql from 'graphql-tag'
import { useQuery } from '../../../graphql/use-query'

const query = gql`
  query fetchMe {
    me {
      id
      name
      email
    }
  }
`

export interface QueryType {
  me?: UserType
}

export interface UserType {
  id: string
  name?: string
  email?: string
  __typename?: 'User'
}

export function fetchMe() {
  return useQuery<QueryType, UserType>(query)
}
