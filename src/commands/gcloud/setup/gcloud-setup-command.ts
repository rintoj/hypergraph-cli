import { command, input } from 'clifer'
import { getProjectRoot, listFiles, resolveFileByEnvironment, runCommand } from '../../../util'
import { readEnv, readEnvironmentVariables } from '../../../environment'
import chalk from 'chalk'

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
