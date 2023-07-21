import { cli } from 'clifer'
import auth from './auth/auth-command'
import build from './build/build-command'
import checkout from './checkout/checkout-command'
import config from './config/config-command'
import project from './project/project-command'

export default cli('hypergraph')
  .command(auth)
  .command(config)
  .command(project)
  .command(checkout)
  .command(build)
