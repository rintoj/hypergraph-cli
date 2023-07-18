import { ApolloClient, HttpLink, InMemoryCache, OperationVariables } from '@apollo/client'
import fetch from 'node-fetch'
import { config, resolveServiceUrl } from '../config/config'

export function useMutation<T, R extends OperationVariables>(mutation: any, variables?: R) {
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
  return client.mutate<T, R>({
    mutation,
    variables,
  })
}
