import { QueryHookOptions, useQuery } from '../../graphql'
import gql from 'graphql-tag'

const query = gql`
  query fetchCheckout($projectId: String!) {
    checkout(projectId: $projectId) {
      id
      name
      sourceFiles {
        fileName
        content
      }
    }
  }
`

export interface RequestType {
  projectId: string | undefined
}

export interface QueryType {
  checkout: ProjectType
}

export interface ProjectType {
  id: string
  name?: string
  sourceFiles: SourceFileType[]
  __typename?: 'Project'
}

export interface SourceFileType {
  fileName: string
  content: string[]
  __typename?: 'SourceFile'
}

export function useCheckoutQuery(
  request: RequestType,
  options?: QueryHookOptions<QueryType, RequestType>,
) {
  return useQuery<QueryType, RequestType>(query, {
    variables: request,
    skip: !request.projectId,
    ...options,
  })
}
