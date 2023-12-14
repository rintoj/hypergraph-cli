import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '../../../graphql'

const query = gql`
  query fetchMyProjects {
    myProjects {
      id
      name
    }
  }
`

export interface QueryType {
  myProjects: ProjectType[]
}

export interface ProjectType {
  id: string
  name?: string
  __typename?: 'Project'
}

export function useMyProjectsQuery(options?: QueryHookOptions<QueryType, never>) {
  return useQuery<QueryType, never>(query, options)
}
