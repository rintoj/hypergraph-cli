import { command } from 'clifer'
import fs from 'fs-extra'
import { useSignOut } from './signout-mutation'
import { saveConfig } from '../../config/config'

export default command<any>('logout')
  .description('Sign out of your account')
  .handle(async () => {
    await useSignOut().catch(error => {
      console.error('Error while trying to sign out.', error.message)
    })
    saveConfig({ accessToken: null })
    console.log('Signed out successfully.')
  })
