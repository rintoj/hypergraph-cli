import fs from 'fs-extra'

interface Config {
  accessToken?: string | null
  remote?: string
  projectId?: string
}

const defaultConfig: Config = {
  remote: 'http://local.hypergraph.in/graphql',
}

const configPath = `${process.env.HOME}/.hypergraph`
const configFile = `${configPath}/config.json`
export let config = readConfig()

export function readConfig() {
  try {
    fs.ensureDirSync(configPath)
    const currentConfig = fs.readJSONSync(configFile) ?? {}
    return currentConfig as Config
  } catch {
    return defaultConfig
  }
}

export function saveConfig(changedConfig: Config) {
  fs.ensureDirSync(configPath)
  const currentConfig = readConfig()
  const finalConfig = { ...defaultConfig, ...currentConfig, ...changedConfig }
  fs.writeFileSync(configFile, JSON.stringify(finalConfig, null, 2))
  config = finalConfig
}

export function resolveServiceUrl() {
  return process.env.HYPERGRAPH_SERVICE_URL ?? config.remote ?? defaultConfig.remote
}
