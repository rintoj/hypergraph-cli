import jsYaml from 'js-yaml'

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
function generateManifests(manifests: string[]) {
  if (!manifests?.length) return {}
  return { deploy: { kubectl: { manifests } } }
}

function generatePortForwardConfig({
  namespace,
  exposeServices,
}: {
  namespace: string
  exposeServices?: ExposeConfig[]
}) {
  if (!exposeServices?.length) return {}
  return {
    portForward: exposeServices
      ?.filter(expose => !!expose)
      .map(expose => ({
        resourceName: expose.serviceName,
        resourceType: 'Service',
        namespace,
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
}: Config) {
  return jsYaml.dump({
    apiVersion: 'skaffold/v2beta24',
    kind: 'Config',
    metadata: { name: projectName },
    ...generateDockerConfigs(projectName, dockerConfigs),
    ...generateManifests(manifests),
    ...generatePortForwardConfig({ namespace, exposeServices }),
  })
}
