import { cli } from 'clifer'
import login from './login/login-command'

export default cli('hypergraph').command(login)
