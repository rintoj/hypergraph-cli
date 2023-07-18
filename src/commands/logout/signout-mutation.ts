import { gql } from '@apollo/client'
import { useMutation } from '../../graphql/use-mutation'
const mutation = gql`
  mutation signOut {
    signOut
  }
`

export interface MutationType {
  signOut?: boolean
}

export async function useSignOut() {
  return useMutation<MutationType, any>(mutation)
}
