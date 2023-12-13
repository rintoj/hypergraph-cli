import gql from 'graphql-tag'
import { MutationHookOptions, useMutation } from '../../../graphql'

const mutation = gql`
  mutation addCollaborator($input: AddCollaboratorInput!) {
    addCollaborator(input: $input) {
      id
    }
  }
`

export interface RequestType {
  input: AddCollaboratorInputType
}

export interface AddCollaboratorInputType {
  asAdmin?: boolean
  projectId: string
  userId: string
  __typename?: 'AddCollaboratorInput'
}

export interface MutationType {
  addCollaborator: UserType
}

export interface UserType {
  id: string
  __typename?: 'User'
}

export function useAddCollaboratorMutation(
  options?: MutationHookOptions<MutationType, RequestType>,
) {
  return useMutation<MutationType, RequestType>(mutation, options)
}
