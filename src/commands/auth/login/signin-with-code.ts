import gql from 'graphql-tag'
import { MutationHookOptions } from '../../../graphql'
import { useMutation } from '../../../graphql/use-mutation'

const mutation = gql`
  mutation signInWithCode($code: String!) {
    signInWithCode(code: $code) {
      accessToken
      user {
        id
        name
      }
    }
  }
`

export interface RequestType {
  code: string
}

export interface MutationType {
  signInWithCode?: SignInWithCodeMutationResponseType
}

export interface SignInWithCodeMutationResponseType {
  accessToken: string
  user?: UserType
  __typename?: 'SignInWithCodeMutationResponse'
}

export interface UserType {
  id: string
  name?: string
}

export function signInWithCode(options?: MutationHookOptions<MutationType, RequestType>) {
  return useMutation<MutationType, RequestType>(mutation, options)
}
