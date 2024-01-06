import jsYaml from 'js-yaml'
import { DeploymentType } from '../deploy'

interface DockerConfig {
  serviceName: string
  dockerfile: string
  infer?: string
}

interface ExposeConfig {
  serviceName: string
  port?: number
  targetPort: number
}

interface Config {
  projectName: string
  namespace: string
  dockerConfigs: DockerConfig[]
  manifests: string[]
  exposeServices?: ExposeConfig[]
  deployment: DeploymentType
}

function generateDockerConfig(
  projectName: string,
  { dockerfile, serviceName, infer = '**/*.{ts,tsx,json}' }: DockerConfig,
) {
  return {
    image: `${projectName}-${serviceName}`,
    context: '.',
    docker: { dockerfile },
    sync: { infer: [infer] },
  }
}

function generateDockerConfigs(projectName: string, dockerConfigs: DockerConfig[]) {
  if (!dockerConfigs?.length) return {}
  const artifacts = dockerConfigs.map(config => generateDockerConfig(projectName, config))
  return { build: { artifacts } }
}

function generateManifests({
  projectName,
  manifests,
  dockerConfigs,
  deployment,
}: {
  projectName: string
  manifests: string[]
  dockerConfigs: DockerConfig[]
  deployment: DeploymentType
}) {
  if (!manifests?.length) return {}
  if (deployment === DeploymentType.KUBERNETES) {
    return { deploy: { kubectl: { manifests } } }
  }
  if (deployment === DeploymentType.CLOUD_FUNCTIONS) {
    const images = dockerConfigs.map(config => `${projectName}-${config.serviceName}`)
    return { deploy: { docker: { images } } }
  }
}

function generatePortForwardConfig({
  projectName,
  namespace,
  exposeServices,
  deployment,
}: {
  projectName: string
  namespace: string
  exposeServices?: ExposeConfig[]
  deployment: DeploymentType
}) {
  if (!exposeServices?.length) return {}
  return {
    portForward: exposeServices
      ?.filter(expose => !!expose)
      .map(expose => ({
        resourceName: `${projectName}-${expose.serviceName}`,
        resourceType: deployment === DeploymentType.CLOUD_FUNCTIONS ? 'container' : 'Service',
        namespace: deployment === DeploymentType.CLOUD_FUNCTIONS ? undefined : namespace,
        port: expose.port ?? 80,
        address: '0.0.0.0',
        localPort: expose.targetPort,
      })),
  }
}

export function buildSkaffoldConfig({
  namespace,
  projectName,
  dockerConfigs,
  manifests,
  exposeServices,
  deployment,
}: Config) {
  return jsYaml.dump({
    apiVersion: 'skaffold/v2beta24',
    kind: 'Config',
    metadata: { name: projectName },
    ...generateDockerConfigs(projectName, dockerConfigs),
    ...generateManifests({ projectName, manifests, dockerConfigs, deployment }),
    ...generatePortForwardConfig({ projectName, namespace, exposeServices, deployment }),
  })
}
