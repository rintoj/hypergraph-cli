import { ApolloClient, HttpLink, InMemoryCache, OperationVariables } from '@apollo/client'
import fetch from 'node-fetch'
import { config, resolveServiceUrl } from '../config/config'

export function useQuery<T, R extends OperationVariables>(query: any, variables?: R) {
  const uri = resolveServiceUrl()
  const { accessToken } = config
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri,
      fetch,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  })
  return client.query<T, R>({
    query,
    variables,
  })
}
