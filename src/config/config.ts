import fs from 'fs-extra'

interface Config {
  accessToken?: string | null
  serviceUrl?: string
}

const defaultConfig: Config = {
  serviceUrl: 'http://local.hypergraph.in/graphql',
}

const configPath = `${process.env.HOME}/.hypergraph`
const configFile = `${configPath}/config.json`
export const config = readConfig()

export function readConfig() {
  fs.ensureDirSync(configPath)
  const currentConfig = fs.readJSONSync(configFile) ?? {}
  return currentConfig as Config
}

export function saveConfig(config: Config) {
  fs.ensureDirSync(configPath)
  const currentConfig = readConfig()
  fs.writeFileSync(
    configFile,
    JSON.stringify({ ...defaultConfig, ...currentConfig, ...config }, null, 2),
  )
}

export function resolveServiceUrl() {
  return process.env.HYPERGRAPH_SERVICE_URL ?? config.serviceUrl ?? defaultConfig.serviceUrl
}
