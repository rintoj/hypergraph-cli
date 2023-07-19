import {
  ApolloClient,
  DocumentNode,
  HttpLink,
  InMemoryCache,
  MutationOptions,
  OperationVariables,
} from '@apollo/client'
import fetch from 'node-fetch'
import { config, resolveServiceUrl } from '../config/config'

export function useMutation<MutationType, RequestType extends OperationVariables>(
  mutation: DocumentNode,
  options?: Omit<MutationOptions<MutationType, RequestType>, 'mutation'>,
) {
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
  return client.mutate<MutationType, RequestType>({
    mutation,
    ...options,
  })
}
