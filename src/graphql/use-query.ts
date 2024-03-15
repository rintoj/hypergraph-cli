import type { ApolloQueryResult, OperationVariables } from '@apollo/client'
import { DocumentNode, print } from 'graphql'
import fetch from 'node-fetch'
import { config, resolveServiceUrl } from '../config/config'

export interface QueryHookOptions<RequestType> {
  query?: DocumentNode
  variables?: RequestType
}

export async function useQuery<QueryType, RequestType extends OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<RequestType>,
): Promise<ApolloQueryResult<QueryType>> {
  const uri = resolveServiceUrl()
  const body = JSON.stringify({ query: print(query), ...options }, null, 2)
  const response = await fetch(uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config?.accessToken}`,
    },
    body,
  })
  return response.json()
}
