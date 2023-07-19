import {
  ApolloClient,
  ApolloQueryResult,
  HttpLink,
  InMemoryCache,
  OperationVariables,
} from '@apollo/client'
import { DocumentNode } from 'graphql'
import fetch from 'node-fetch'
import { config, resolveServiceUrl } from '../config/config'

export interface QueryHookOptions<RequestType> {
  query?: DocumentNode
  variables?: RequestType
  skip?: boolean
}

export async function useQuery<QueryType, RequestType extends OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<RequestType>,
): Promise<ApolloQueryResult<QueryType>> {
  const uri = resolveServiceUrl()
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri,
      fetch,
      headers: {
        Authorization: `Bearer ${config?.accessToken}`,
      },
    }),
  })
  return client.query<QueryType, RequestType>({
    query,
    ...options,
  })
}
