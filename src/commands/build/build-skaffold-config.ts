import jsYaml from 'js-yaml'

interface DockerConfig {
  serviceName: string
  dockerfile: string
  infer?: string
}

interface Config {
  projectName: string
  namespace: string
  dockerConfigs: DockerConfig[]
  manifests: string[]
  expose?: number
}

function generateDockerConfig(
  projectName: string,
  { dockerfile, serviceName, infer = '**/*.{ts,tsx,json}' }: DockerConfig,
) {
  return {
    image: `${projectName}-${serviceName}`,
    context: '.',
    docker: { dockerfile },
    // sync: { infer: [infer] },
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
  projectName,
  namespace,
  expose,
}: {
  projectName: string
  namespace: string
  expose?: number
}) {
  if (!expose) return {}
  return {
    portForward: [
      {
        resourceName: `${projectName}-api-service`,
        resourceType: 'Service',
        namespace,
        port: 80,
        address: '0.0.0.0',
        localPort: expose,
      },
    ],
  }
}

export function buildSkaffoldConfig({
  namespace,
  projectName,
  dockerConfigs,
  manifests,
  expose,
}: Config) {
  return jsYaml.dump({
    apiVersion: 'skaffold/v2beta24',
    kind: 'Config',
    metadata: { name: projectName },
    ...generateDockerConfigs(projectName, dockerConfigs),
    ...generateManifests(manifests),
    ...generatePortForwardConfig({ projectName, namespace, expose }),
  })
}
