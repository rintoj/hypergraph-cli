import { cli } from 'clifer'
import auth from './auth/auth-command'
import build from './build/build-command'
import checkout from './checkout/checkout-command'
import config from './config/config-command'
import create from './create/create-command'
import deploy from './deploy/deploy-command'
import gcloud from './gcloud/gcloud-command'
import generate from './generate/generate-command'
import init from './init/init-command'
import save from './save/save-command'

export default cli('hypergraph')
  .command(auth)
  .command(build)
  .command(config)
  .command(create)
  .command(checkout)
  .command(deploy)
  .command(gcloud)
  .command(generate)
  .command(init)
  .command(save)
