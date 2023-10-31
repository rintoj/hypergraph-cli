import { cli } from 'clifer'
import auth from './auth/auth-command'
import build from './build/build-command'
import checkout from './checkout/checkout-command'
import config from './config/config-command'
import deploy from './deploy/deploy-command'
import gcloud from './gcloud/gcloud-command'
import init from './init/init-command'
import save from './save/save-command'

export default cli('hypergraph')
  .command(auth)
  .command(build)
  .command(config)
  .command(checkout)
  .command(deploy)
  .command(gcloud)
  .command(init)
  .command(save)
