import { cli } from 'clifer'
import login from './login/login-command'
import user from './user/user-command'

export default cli('hypergraph').command(login).command(user)
