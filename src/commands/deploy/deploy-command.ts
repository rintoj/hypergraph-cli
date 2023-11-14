import { command, input } from 'clifer'
import { readEnvironmentVariables } from '../../environment'
import { withErrorHandler } from '../../util/error-handler'
import { getProjectRoot } from '../../util/get-project-root'
import { listFiles, readPackageJSON } from '../../util/project-util'
import { resolveFileByEnvironment } from '../../util/resolve-file-by-environment'
import { runCommand } from '../../util/run-command'

interface Props {
  environment: string
  create?: boolean
  clean?: boolean
}

async function checkIfClusterExists(env: any) {
  const { CLUSTER } = env
  if (!CLUSTER) throw new Error('Environment is missing CLUSTER')
  try {
    const output = await runCommand(`gcloud container clusters describe ${CLUSTER}`)
    if (output.length) return true
  } catch {
    return false
  }
}
async function createCluster(env: any) {
  const { CLUSTER, REGION, PROJECT_ID } = env
  if (!CLUSTER) throw new Error('Environment is missing CLUSTER')
  if (!PROJECT_ID) throw new Error('Environment is missing PROJECT_ID')
  if (!REGION) throw new Error('Environment is missing REGION')
  if (await checkIfClusterExists(env)) return
  const command = `gcloud container clusters create-auto ${CLUSTER} \
    --location=${REGION} \
    --project=${PROJECT_ID}`
  await runCommand(command)
}

async function checkIfContainerRegistryExists(env: any) {
  const { CONTAINER_REGISTRY, REGION, PROJECT_ID } = env
  if (!CONTAINER_REGISTRY) throw new Error('Environment is missing CONTAINER_REGISTRY')
  if (!REGION) throw new Error('Environment is missing REGION')
  if (!PROJECT_ID) throw new Error('Environment is missing PROJECT_ID')
  const [location] = CONTAINER_REGISTRY.split('.')
  const [repository] = CONTAINER_REGISTRY.split('/')
  try {
    const output = await runCommand(
      `gcloud artifacts repositories describe ${repository} --project=${PROJECT_ID} --location=${location}`,
    )
    if (output.length) return true
  } catch {
    return false
  }
}
async function createContainerRegistry(env: any) {
  const { CONTAINER_REGISTRY, REGION, PROJECT_ID } = env
  if (!CONTAINER_REGISTRY) throw new Error('Environment is missing CONTAINER_REGISTRY')
  if (!REGION) throw new Error('Environment is missing REGION')
  if (!PROJECT_ID) throw new Error('Environment is missing PROJECT_ID')
  const [location] = CONTAINER_REGISTRY.split('.')
  const [repository] = CONTAINER_REGISTRY.split('/')
  if (await checkIfContainerRegistryExists(env)) return
  const command = `gcloud artifacts repositories create ${repository} \
    --repository-format=docker \
    --location=${location}`
  await runCommand(command)
}

async function configureProject(env: any) {
  const { PROJECT_ID, REGION } = env
  if (!PROJECT_ID) throw new Error('Environment is missing PROJECT_ID')
  if (!REGION) throw new Error('Environment is missing REGION')
  await runCommand(`gcloud config set project ${PROJECT_ID}`)
  await runCommand(`gcloud config set compute/region ${REGION}`)
}

async function checkIfAuthenticated() {
  try {
    const output = await runCommand(`gcloud auth print-access-token`, { silent: true })
    if (output.length) return
  } catch {
    await runCommand(`gcloud auth login`)
  }
}

async function run({ create, clean, environment }: Props) {
  return withErrorHandler(async () => {
    const projectRoot = `${(await getProjectRoot()) ?? ''}/backend`
    const packageJSON = await readPackageJSON(projectRoot)
    const projectName = packageJSON?.hypergraph?.projectName
    if (!projectName)
      throw new Error(`Project name is missing. Define it under package.json as
  {
    "hypergraph": {
      "projectName": "PROJECT_NAME"
    }
  }
  `)
    const environmentFiles = resolveFileByEnvironment(
      listFiles(projectRoot, 'env*.{yaml,yml}'),
      environment,
    )
    const env = await readEnvironmentVariables(environmentFiles)
    await checkIfAuthenticated()
    await configureProject(env)
    if (create) {
      await createCluster(env)
      await createContainerRegistry(env)
    } else {
      if (!(await checkIfClusterExists(env))) {
        throw new Error(`Missing cluster: ${env.CLUSTER}`)
      }
      if (!(await checkIfContainerRegistryExists(env))) {
        throw new Error(`Missing container registry : ${env.CONTAINER_REGISTRY}`)
      }
    }
    await runCommand(`hypergraph build --environment=${environment} ${clean ? '--clean' : ''}`)
    await runCommand(
      `skaffold run --namespace=${projectName}-${environment} --default-repo=${env.CONTAINER_REGISTRY} --status-check=false`,
    )
  })
}

export default command<Props>('deploy')
  .description('Deploy a project')
  .option(input('environment').description('Environment').string().required().prompt())
  .option(
    input('create').description(
      'Create missing resources such as cluster, container registry and certificates as needed',
    ),
  )
  .option(
    input('clean').description(
      'Do a clean build by removing previous environments, cache and config',
    ),
  )
  .handle(run)
