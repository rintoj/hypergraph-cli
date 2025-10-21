import { cli } from 'clifer'
import auth from './auth/auth-command'
import build from './build/build-command'
import checkout from './checkout/checkout-command'
import collaborator from './collaborator/collaborator-command'
import config from './config/config-command'
import create from './create/create-command'
import deploy from './deploy/deploy-command'
import figma from './figma/figma-command'
import gcloud from './gcloud/gcloud-command'
import generate from './generate/generate-command'
import graphql from './graphql/graphql-command'
import project from './project/project-command'
import save from './save/save-command'

export default cli('hypergraph')
  .command(auth)
  .command(build)
  .command(checkout)
  .command(collaborator)
  .command(config)
  .command(create)
  .command(deploy)
  .command(figma)
  .command(gcloud)
  .command(generate)
  .command(graphql)
  .command(project)
  .command(save)
