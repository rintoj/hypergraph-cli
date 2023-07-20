import { QueryHookOptions, useQuery } from '../../graphql'
import gql from 'graphql-tag'

const query = gql`
  query fetchCheckout($next: String, $projectId: String!) {
    checkout(next: $next, projectId: $projectId) {
      next
      project {
        id
        name
        sourceFiles {
          fileName
          content
        }
      }
    }
  }
`

export interface RequestType {
  next?: string | undefined
  projectId: string | undefined
}

export interface QueryType {
  checkout: CheckoutResponseType
}

export interface CheckoutResponseType {
  next?: string
  project: ProjectType
  __typename?: 'CheckoutResponse'
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
