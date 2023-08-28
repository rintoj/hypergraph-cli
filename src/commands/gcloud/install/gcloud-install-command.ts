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
    if (PROJECT_ID) await runCommand(`gcloud config set project ${PROJECT_ID}`)
    await runCommand('gcloud components install gke-gcloud-auth-plugin --quiet')
    await setupClusterConfig({ environment })
  } catch (e) {
    console.error(chalk.red(e))
  }
}

export default command<Props>('install')
  .description('Install all the required libraries for Google Cloud')
  .option(input('environment').description('Environment').string().required())
  .handle(run)
