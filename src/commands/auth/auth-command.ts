import { command } from 'clifer'
import login from './login/login-command'
import logout from './logout/logout-command'
import user from './user/user-command'

export default command('auth')
  .description('Commands for managing authentication and access.')
  .command(login)
  .command(logout)
  .command(user)
