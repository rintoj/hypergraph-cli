import { QueryHookOptions, useQuery } from '../../../graphql'
import gql from 'graphql-tag'

const query = gql`
  query fetchProjectId($name: String!) {
    projectId(name: $name)
  }
`

export interface RequestType {
  name: string | undefined
}

export interface QueryType {
  projectId?: string
}

export function useProjectIdQuery(
  request: RequestType,
  options?: QueryHookOptions<QueryType, RequestType>,
) {
  return useQuery<QueryType, RequestType>(query, {
    variables: request,
    skip: !request.name,
    ...options,
  })
}
