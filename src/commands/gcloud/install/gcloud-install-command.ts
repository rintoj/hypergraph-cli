import chalk from 'chalk'
import { command, input } from 'clifer'
import { readEnv } from '../../../environment'
import { runCommand } from '../../../util'
import { setupClusterConfig } from '../setup/gcloud-setup-command'

interface Props {
  environment: string
}

async function run({ environment }: Props) {
  try {
    const env = await readEnv(environment)
    const { PROJECT_ID } = env
    await runCommand('brew install --cask google-cloud-sdk')
    await runCommand('gcloud auth login --quiet')
    await runCommand('gcloud components install gke-gcloud-auth-plugin --quiet')
    await setupClusterConfig({ environment })
  } catch (e) {
    console.error(chalk.red(e))
  }
}

export default command<Props>('install')
  .description('Install all required libraries for Google Cloud')
  .option(input('environment').description('Specify the target environment').string().required())
  .handle(run)
