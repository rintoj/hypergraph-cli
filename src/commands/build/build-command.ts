import { command, input } from 'clifer'
import { writeFile } from 'fs-extra'
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
import { buildSkaffoldConfig } from './build-skaffold-config'

interface Props {
  environment: string
  api?: string
  dbPort?: number
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
}: {
  projectRoot: string
  projectName: string
  environment: string
  env: Record<string, string>
  namespace: string
  api?: string
  dbPort?: number
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
      const [serviceName, targetPort = '4000'] = service.split(':')
      return { serviceName, port: 80, targetPort: parseInt(targetPort, undefined) }
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

function setupDocker(kubeContext: string) {
  if (!kubeContext) return
  return runCommand(`kubectl config use-context ${kubeContext}`)
}

async function configureEnvironment(environmentFiles: string[], clean: boolean = false) {
  if (!environmentFiles?.length) return
  if (clean) await runCommand(`kubectl delete -f ${environmentFiles.join(' ')}`)
  return runCommand(`kubectl apply -f ${environmentFiles.join(' ')}`)
}

async function setupCluster(env: any) {
  if (env.CLOUD !== 'gcloud') return
  const command = `gcloud container clusters get-credentials ${env.CLUSTER} --region ${env.REGION} --project ${env.PROJECT_ID}`
  await runCommand(command)
}

async function run({ clean, environment, api, dbPort }: Props) {
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
      listFiles(projectRoot, 'env*.{yaml,yml}'),
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
    })
    await setupDocker(env.KUBE_CONTEXT)
    await setupCluster(env)
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
