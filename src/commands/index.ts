import { cli } from 'clifer'
import auth from './auth/auth-command'
import build from './build/build-command'
import checkout from './checkout/checkout-command'
import config from './config/config-command'
import gcloud from './gcloud/gcloud-command'
import save from './save/save-command'

export default cli('hypergraph')
  .command(auth)
  .command(config)
  .command(gcloud)
  .command(checkout)
  .command(build)
  .command(save)
