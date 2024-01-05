import { DeploymentType } from '../deploy'
import { buildSkaffoldConfig } from './build-skaffold-config'

describe('build-skaffold-config', () => {
  test('should generate config for kubernetes build', () => {
    const output = buildSkaffoldConfig({
      namespace: 'todo-dev',
      projectName: 'todo',
      dockerConfigs: [{ serviceName: 'api', dockerfile: 'Dockerfile.dev' }],
      manifests: ['services/api-service/deployment.dev', 'services/ingress-service/deployment.dev'],
      exposeServices: [{ serviceName: 'api', targetPort: 4001 }],
      deployment: DeploymentType.KUBERNETES,
    })
    expect(output).toEqual(`apiVersion: skaffold/v4beta8
kind: Config
metadata:
  name: todo
build:
  artifacts:
    - image: todo-api
      context: .
      docker:
        dockerfile: Dockerfile.dev
      sync:
        infer:
          - '**/*.{ts,tsx,json}'
deploy:
  kubectl:
    manifests:
      - services/api-service/deployment.dev
      - services/ingress-service/deployment.dev
portForward:
  - resourceName: api
    resourceType: Service
    namespace: todo-dev
    port: 80
    address: 0.0.0.0
    localPort: 4001
`)
  })

  test('should generate config for cloud-functions build', () => {
    const output = buildSkaffoldConfig({
      namespace: 'todo-dev',
      projectName: 'todo',
      dockerConfigs: [{ serviceName: 'api', dockerfile: 'Dockerfile.dev' }],
      manifests: ['services/api-service/deployment.dev', 'services/ingress-service/deployment.dev'],
      exposeServices: [{ serviceName: 'api', targetPort: 4001 }],
      deployment: DeploymentType.CLOUD_FUNCTIONS,
    })
    expect(output).toEqual(`apiVersion: skaffold/v4beta8
kind: Config
metadata:
  name: todo
build:
  artifacts:
    - image: todo-api
      context: .
      docker:
        dockerfile: Dockerfile.dev
      sync:
        infer:
          - '**/*.{ts,tsx,json}'
deploy:
  docker:
    images:
      - todo-api
portForward:
  - resourceName: todo-api
    resourceType: container
    port: 80
    address: 0.0.0.0
    localPort: 4001
`)
  })
})
