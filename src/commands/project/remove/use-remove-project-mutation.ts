import { MutationHookOptions, useMutation } from '../../../graphql'
import gql from 'graphql-tag'

const mutation = gql`
  mutation removeProject($projectId: String!) {
    removeProject(projectId: $projectId) {
      id
      name
    }
  }
`

export interface RequestType {
  projectId: string
}

export interface MutationType {
  removeProject: ProjectType
}

export interface ProjectType {
  id: string
  name?: string
  __typename?: 'Project'
}

export function useRemoveProjectMutation(options?: MutationHookOptions<MutationType, RequestType>) {
  return useMutation<MutationType, RequestType>(mutation, options)
}
