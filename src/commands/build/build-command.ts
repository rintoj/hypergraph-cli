import { command, input } from 'clifer'
import { readFile, writeFile } from 'fs-extra'
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
import { readEnvironmentVariables } from './read-environment'

interface Props {
  environment: string
  expose?: number
}
const SKAFFOLD_FILE = 'skaffold.yaml'

async function generateSkaffoldConfig({
  projectRoot,
  projectName,
  environment,
  namespace,
  expose,
}: {
  projectRoot: string
  projectName: string
  environment: string
  namespace: string
  expose?: number
}) {
  const environmentFiles = resolveFileByEnvironment(
    listFiles(projectRoot, 'env*.{yaml,yml}'),
    environment,
  )
  const dockerFiles = resolveFileByEnvironment(
    listFiles(projectRoot, 'services', '*', 'Docker*'),
    environment,
  )
  const deployments = environmentFiles.concat(
    resolveFileByEnvironment(
      listFiles(projectRoot, 'services', '*', 'deployment*.{yaml,yml}'),
      environment,
    ),
  )
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
    expose,
  })
  await writeFile(`${projectRoot}/${SKAFFOLD_FILE}`, skaffoldConfig)
}

function setupDocker(kubeContext: string) {
  if (!kubeContext) return
  return runCommand(`kubectl config use-context ${kubeContext}`)
}

async function run({ environment, expose }: Props) {
  const projectRoot = `${(await getProjectRoot()) ?? ''}/backend`
  const packageJSON = await readPackageJSON(projectRoot)
  const projectName = packageJSON.hypergraph.projectName
  const namespace = `${projectName}-${environment}`
  const env = await readEnvironmentVariables(projectRoot, environment)
  await generateSkaffoldConfig({
    projectName,
    projectRoot,
    environment,
    namespace,
    expose,
  })
  await setupDocker(env.KUBE_CONTEXT)
}

export default command<Props>('build')
  .description('Build a project')
  .option(input('environment').description('Environment').string().required().prompt())
  .option(input('expose').description('Expose the graphql API through a port').number())
  .handle(run)
