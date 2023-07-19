import { gql } from '@apollo/client'
import { useMutation } from '../../../graphql/use-mutation'

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
  return useMutation<MutationType, RequestType>(mutation, { variables: { input } })
}
