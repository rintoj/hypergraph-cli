import type { DocumentNode, MutationOptions, OperationVariables } from '@apollo/client'
import { print } from 'graphql'
import fetch from 'node-fetch'
import { config, resolveServiceUrl } from '../config/config'

export interface MutationHookOptions<RequestType> {
  query?: DocumentNode
  variables?: RequestType
}

export async function useMutation<MutationType, RequestType extends OperationVariables>(
  mutation: DocumentNode,
  options?: Omit<MutationOptions<MutationType, RequestType>, 'mutation'>,
) {
  const uri = resolveServiceUrl()
  const body = JSON.stringify({ query: print(mutation), ...options }, null, 2)
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
