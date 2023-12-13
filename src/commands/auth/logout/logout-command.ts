import { command } from 'clifer'
import { saveConfig } from '../../../config/config'
import { useSignOut } from './signout-mutation'

export default command<any>('logout')
  .description('Sign out of your account')
  .handle(async () => {
    await useSignOut().catch(error => {
      console.error('Error while trying to logout.', error.message)
    })
    saveConfig({ accessToken: null })
    console.log('Logout completed successfully.')
  })
