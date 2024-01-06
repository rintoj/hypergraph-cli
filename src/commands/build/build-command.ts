import { command, input } from 'clifer'
import { sync } from 'fast-glob'
import { copyFile, ensureDir, remove, writeFile } from 'fs-extra'
import { dirname, resolve } from 'path'
import { readEnvironmentVariables } from '../../environment'
import { withErrorHandler } from '../../util/error-handler'
import { getProjectRoot } from '../../util/get-project-root'
import {
  listFiles,
  readPackageJSON,
  serviceNameFromPath,
  toRelativePathFromProjectRoot,
} from '../../util/project-util'
import { resolveFileByEnvironment } from '../../util/resolve-file-by-environment'
import { runCommand } from '../../util/run-command'
import { DeploymentType } from '../deploy'
import { buildSkaffoldConfig } from './build-skaffold-config'

interface Props {
  environment: string
  api?: string
  dbPort?: number
  deployment?: DeploymentType
  clean?: boolean
}
const SKAFFOLD_FILE = 'skaffold.yaml'

async function generateSkaffoldConfig({
  projectRoot,
  projectName,
  environment,
  env,
  namespace,
  api,
  dbPort,
  deployment,
}: {
  projectRoot: string
  projectName: string
  environment: string
  env: Record<string, string>
  namespace: string
  api?: string
  dbPort?: number
  deployment: DeploymentType
}) {
  const dockerFiles = resolveFileByEnvironment(
    listFiles(projectRoot, 'services', '*', 'Docker*'),
    environment,
  )
  const deployments = resolveFileByEnvironment(
    listFiles(projectRoot, 'services', '*', 'deployment*.{yaml,yml}'),
    environment,
  )
  const hasPostgres =
    deployments.find(deployment => /postgres-service/.test(deployment)) !== undefined
  const exposeServices = api
    ?.split(',')
    .map(service => {
      const [serviceName, port = '4000', targetPort = '4000'] = service.split(':')
      return {
        serviceName,
        port: parseInt(port),
        targetPort: parseInt(targetPort ?? port, undefined),
      }
    })
    .concat([
      dbPort !== undefined && hasPostgres
        ? {
            serviceName: `${projectName}-postgres-service`,
            port: env.DB_PORT ?? 80,
            targetPort: dbPort,
          }
        : (undefined as any),
    ])
  const skaffoldConfig = buildSkaffoldConfig({
    projectName,
    namespace,
    deployment,
    dockerConfigs: dockerFiles.map(dockerfile => ({
      serviceName: serviceNameFromPath(dockerfile),
      dockerfile: toRelativePathFromProjectRoot(dockerfile, projectRoot),
    })),
    manifests: deployments.map(deployment =>
      toRelativePathFromProjectRoot(deployment, projectRoot),
    ),
    exposeServices,
  })
  await writeFile(`${projectRoot}/${SKAFFOLD_FILE}`, skaffoldConfig)
}

function setupKubeContext(kubeContext: string, deployment: DeploymentType) {
  if (deployment !== DeploymentType.KUBERNETES) return
  if (!kubeContext) {
    throw new Error('Missing KUBE_CONTEXT in the environment')
  }
  return runCommand(`kubectl config use-context ${kubeContext}`)
}

async function configureEnvironment(environmentFiles: string[], clean: boolean = false) {
  const envFiles = environmentFiles.filter(f => /\.ya?ml/.test(f))
  if (!envFiles?.length) return
  if (clean) await runCommand(`kubectl delete -f ${envFiles.join(' ')}`)
  return runCommand(`kubectl apply -f ${envFiles.join(' ')}`)
}

async function setupCluster(env: any, deployment: DeploymentType) {
  if (deployment !== DeploymentType.KUBERNETES) return
  if (env.CLOUD !== 'gcloud') return
  const command = `gcloud container clusters get-credentials ${env.CLUSTER} --region ${env.REGION} --project ${env.PROJECT_ID}`
  await runCommand(command)
}

async function buildWorkspaces(projectRoot: string) {
  const buildDir = resolve(projectRoot, 'build')
  await remove(buildDir)
  const packageJSON = await readPackageJSON(projectRoot)
  const packages = packageJSON.workspaces?.packages ?? packageJSON?.workspaces ?? []
  if (!packages?.length) return
  const pattern = packages.length == 1 ? packages[0] : `{${packages.join(',')}}`
  const glob = `${projectRoot}/${pattern}/package.json`
  const files = sync(glob)
  for (const file of files) {
    const targetFile = file.replace(projectRoot, buildDir)
    await ensureDir(dirname(targetFile))
    copyFile(file, targetFile)
  }
}

async function run({
  clean,
  environment,
  api,
  dbPort,
  deployment = DeploymentType.CLOUD_FUNCTIONS,
}: Props) {
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
    const namespace = `${projectName}-${environment}`
    const environmentFiles = resolveFileByEnvironment(
      listFiles(projectRoot, '{.env*,env*.yaml,env*.yml}'),
      environment,
    )
    const env = await readEnvironmentVariables(environmentFiles)
    await generateSkaffoldConfig({
      projectName,
      projectRoot,
      environment,
      env,
      namespace,
      api,
      dbPort,
      deployment,
    })
    await buildWorkspaces(projectRoot)
    await setupKubeContext(env.KUBE_CONTEXT, deployment)
    await setupCluster(env, deployment)
    await configureEnvironment(environmentFiles, clean)
  })
}

export default command<Props>('build')
  .description('Build a project')
  .option(
    input('environment')
      .description('Specify the project environment')
      .string()
      .required()
      .prompt(),
  )
  .option(
    input('api')
      .description('List all api services in the format "name:port" for local exposure')
      .string(),
  )
  .option(
    input('deployment')
      .description('Define type of deployment to be "kubernetes" or "cloud-functions" (default)')
      .string()
      .choices([DeploymentType.CLOUD_FUNCTIONS, DeploymentType.KUBERNETES]),
  )
  .option(
    input('dbPort')
      .description('Expose the database through a specified port, if defined')
      .number(),
  )
  .option(
    input('clean').description(
      'Perform a clean build by removing previous environments, cache, and config',
    ),
  )
  .handle(run)
