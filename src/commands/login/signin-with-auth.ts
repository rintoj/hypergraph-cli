import { ApolloClient, gql, HttpLink, InMemoryCache } from '@apollo/client'
import fetch from 'node-fetch'

const mutation = gql`
  mutation signInWithOauth($input: SignInWithOauthMutationInput!) {
    signInWithOauth(input: $input) {
      accessToken
      user {
        id
        name
      }
    }
  }
`

export interface RequestType {
  input: SignInWithOauthMutationInputType
}

export interface SignInWithOauthMutationInputType {
  authorizationCode: string
  provider: AuthenticationProvider
  redirectUri: string
  __typename?: 'SignInWithOauthMutationInput'
}

export enum AuthenticationProvider {
  GITHUB = 'GITHUB',
  GOOGLE = 'GOOGLE',
}

export interface MutationType {
  signInWithOauth?: SignInWithOauthMutationResponseType
}

export interface SignInWithOauthMutationResponseType {
  accessToken: string
  user: UserType
  __typename?: 'SignInWithOauthMutationResponse'
}

export interface UserType {
  id: string
  name: string
  __typename?: 'User'
}

export async function signInWithOauth({ input }: RequestType) {
  const uri = process.env.HYPERGRAPH_SERVICE_URL ?? 'http://local.hypergraph.in/graphql'
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({ uri, fetch }),
  })
  return client.mutate<MutationType, RequestType>({
    mutation,
    variables: { input },
  })
}
