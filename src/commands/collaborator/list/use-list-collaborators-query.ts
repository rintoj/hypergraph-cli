import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '../../../graphql'

const query = gql`
  query fetchCollaborators($projectId: String!) {
    collaborators(projectId: $projectId) {
      user {
        id
        name
        email
      }
      role
    }
  }
`

export interface RequestType {
  projectId: string | undefined
}

export interface QueryType {
  collaborators: CollaboratorType[]
}

export interface CollaboratorType {
  user?: UserType
  role?: CollaboratorRole
  __typename?: 'Collaborator'
}

export interface UserType {
  id: string
  name?: string
  email?: string
  __typename?: 'User'
}

export enum CollaboratorRole {
  ADMIN = 'ADMIN',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

export function useCollaboratorsQuery(
  request: RequestType,
  options?: QueryHookOptions<QueryType, RequestType>,
) {
  return useQuery<QueryType, RequestType>(query, {
    variables: request,
    skip: !request.projectId,
    ...options,
  })
}
