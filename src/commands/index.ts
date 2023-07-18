import { cli } from 'clifer'
import login from './login/login-command'
import logout from './logout/logout-command'
import user from './user/user-command'
import config from './config/config-command'

export default cli('hypergraph').command(login).command(logout).command(user).command(config)
