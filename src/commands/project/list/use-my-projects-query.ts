import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '../../../graphql'

const query = gql`
  query fetchMyProjects($pagination: PaginationInput) {
    myProjects(pagination: $pagination) {
      items {
        id
        name
      }
    }
  }
`

export interface RequestType {
  pagination?: PaginationInputType | undefined
}

export interface PaginationInputType {
  limit?: number
  next?: string
  __typename?: 'PaginationInput'
}

export interface QueryType {
  myProjects?: ProjectsType
}

export interface ProjectsType {
  items: ProjectType[]
  __typename?: 'Projects'
}

export interface ProjectType {
  id: string
  name?: string
  __typename?: 'Project'
}

export function useMyProjectsQuery(
  request: RequestType,
  options?: QueryHookOptions<QueryType, RequestType>,
) {
  return useQuery<QueryType, RequestType>(query, {
    variables: request,
    ...options,
  })
}
