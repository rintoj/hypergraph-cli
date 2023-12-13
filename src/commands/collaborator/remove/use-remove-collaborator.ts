import gql from 'graphql-tag'
import { MutationHookOptions, useMutation } from '../../../graphql'

const mutation = gql`
  mutation removeCollaborator($input: RemoveCollaboratorInput!) {
    removeCollaborator(input: $input) {
      id
    }
  }
`

export interface RequestType {
  input: RemoveCollaboratorInputType
}

export interface RemoveCollaboratorInputType {
  projectId: string
  userId: string
  __typename?: 'RemoveCollaboratorInput'
}

export interface MutationType {
  removeCollaborator: UserType
}

export interface UserType {
  id: string
  __typename?: 'User'
}

export function useRemoveCollaboratorMutation(
  options?: MutationHookOptions<MutationType, RequestType>,
) {
  return useMutation<MutationType, RequestType>(mutation, options)
}
