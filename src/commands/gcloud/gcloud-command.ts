import { command } from 'clifer'
import install from './install/gcloud-install-command'
import setup from './setup/gcloud-setup-command'

export default command('gcloud')
  .command(setup)
  .command(install)
  .description('Configure and install tools for Google Cloud')
