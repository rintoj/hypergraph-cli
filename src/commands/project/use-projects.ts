import gql from 'graphql-tag'
import { useQuery } from '../../graphql/use-query'

const query = gql`
  query fetchMyProjects($pagination: PaginationInput) {
    myProjects(pagination: $pagination) {
      next
      items {
        id
        name
        createdBy {
          id
          name
        }
        status
        updatedAt
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
  next?: string
  items: ProjectType[]
  __typename?: 'Projects'
}

export interface ProjectType {
  id: string
  name?: string
  createdBy?: UserType
  status?: ProjectStatus
  updatedAt?: string
  __typename?: 'Project'
}

export interface UserType {
  id: string
  name?: string
  __typename?: 'User'
}

export enum ProjectStatus {
  InDraft = 'InDraft',
  Published = 'Published',
}

export function useMyProjectsQuery(request: RequestType) {
  return useQuery<QueryType, RequestType>(query, { variables: request })
}
