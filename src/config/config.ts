import fs from 'fs-extra'

interface Config {
  accessToken?: string | null
  remote?: string
}

const defaultConfig: Config = {
  remote: 'http://local.hypergraph.in/graphql',
}

const configPath = `${process.env.HOME}/.hypergraph`
const configFile = `${configPath}/config.json`
export const config = readConfig()

export function readConfig() {
  try {
    fs.ensureDirSync(configPath)
    const currentConfig = fs.readJSONSync(configFile) ?? {}
    return currentConfig as Config
  } catch {
    return defaultConfig
  }
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
  return process.env.HYPERGRAPH_SERVICE_URL ?? config.remote ?? defaultConfig.remote
}
