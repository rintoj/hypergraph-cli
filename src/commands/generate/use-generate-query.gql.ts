import { QueryHookOptions, useQuery } from '../../graphql'
import gql from 'graphql-tag'

const query = gql`
  query fetchGenerate($input: GenerateQueryInput!) {
    generate(input: $input) {
      project {
        id
        name
        sourceFiles {
          fileName
          content
          status
        }
      }
      response
    }
  }
`

export interface RequestType {
  input: GenerateQueryInputType | undefined
}

export interface GenerateQueryInputType {
  history?: string
  projectId: string
  prompt: string
  __typename?: 'GenerateQueryInput'
}

export interface QueryType {
  generate: GenerateQueryResponseType
}

export interface GenerateQueryResponseType {
  project: ProjectType
  response: string
  __typename?: 'GenerateQueryResponse'
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
  status?: SourceFileStatus
  __typename?: 'SourceFile'
}

export enum SourceFileStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export function useGenerateQuery(
  request: RequestType,
  options?: QueryHookOptions<QueryType, RequestType>,
) {
  return useQuery<QueryType, RequestType>(query, {
    variables: request,
    skip: !request.input,
    ...options,
  })
}
