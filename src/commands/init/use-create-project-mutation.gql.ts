import gql from 'graphql-tag'
import { MutationHookOptions, useMutation } from '../../graphql'

const mutation = gql`
  mutation createProject($input: CreateProjectMutationInput!) {
    createProject(input: $input) {
      id
      name
    }
  }
`

export interface RequestType {
  input: CreateProjectMutationInputType
}

export interface CreateProjectMutationInputType {
  name: string
  projectId: string
  __typename?: 'CreateProjectMutationInput'
}

export interface MutationType {
  createProject?: ProjectType
}

export interface ProjectType {
  id: string
  name?: string
  __typename?: 'Project'
}

export function useCreateProjectMutation(options?: MutationHookOptions<MutationType, RequestType>) {
  return useMutation<MutationType, RequestType>(mutation, options)
}
