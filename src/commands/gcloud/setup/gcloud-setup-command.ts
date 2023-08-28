import chalk from 'chalk'
import { command, input } from 'clifer'
import { readEnv } from '../../../environment'
import { runCommand } from '../../../util'

interface Props {
  environment: string
}

export async function setupClusterConfig({ environment }: Props) {
  try {
    const env = await readEnv(environment)
    const { PROJECT_ID, REGION, CLUSTER } = env
    if (!PROJECT_ID) throw new Error(`Environment "${environment}" is missing PROJECT_ID!`)
    if (!REGION) throw new Error(`Environment "${environment}" is missing REGION!`)
    if (!CLUSTER) throw new Error(`Environment "${environment}" is missing CLUSTER!`)
    await runCommand(`gcloud config set project ${PROJECT_ID}`)
    await runCommand('gcloud auth configure-docker gcr.io --quiet')
    await runCommand(
      `gcloud container clusters get-credentials ${CLUSTER} --region ${REGION} --project ${PROJECT_ID}`,
    )
  } catch (e) {
    console.log(chalk.red(e))
  }
}

export default command<Props>('setup')
  .description('Configure Google Cloud environment')
  .option(input('environment').description('Select environment').string().required())
  .handle(setupClusterConfig)
