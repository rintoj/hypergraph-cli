import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '../graphql'

const query = gql`
  query fetchMyProjects {
    myProjects {
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
`

export interface QueryType {
  myProjects: ProjectType[]
}

export interface ProjectType {
  id: string
  name?: string
  createdBy?: UserType
  status?: ProjectStatus
  updatedAt?: DateTime
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

export function useMyProjectsQuery(options?: QueryHookOptions<QueryType, never>) {
  return useQuery<QueryType, never>(query, options)
}
