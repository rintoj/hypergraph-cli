import { MutationHookOptions, useMutation } from '../../graphql'
import gql from 'graphql-tag'

const query = gql`
  mutation saveSourceFiles($input: SaveSourceFilesInput!) {
    saveSourceFiles(input: $input) {
      id
    }
  }
`

export interface RequestType {
  input: SaveSourceFilesInputType
}

export interface SaveSourceFilesInputType {
  projectId: string
  sourceFiles: SourceFileContentInputType[]
  __typename?: 'SaveSourceFilesInput'
}

export interface SourceFileContentInputType {
  content: string
  fileName: string
  __typename?: 'SourceFileContentInput'
}

export interface MutationType {
  saveSourceFiles: ProjectType
}

export interface ProjectType {
  id: string
  __typename?: 'Project'
}

export function useSaveSourceFilesMutation(
  options?: MutationHookOptions<MutationType, RequestType>,
) {
  return useMutation<MutationType, RequestType>(query, options)
}
