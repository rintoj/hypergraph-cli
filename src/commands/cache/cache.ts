import fs from 'fs-extra'

interface Cache {
  checkoutToken?: string
}

const defaultConfig: Cache = {}

function toPaths(projectRoot: string) {
  const configPath = `${projectRoot}/.hypergraph`
  const configFile = `${configPath}/cache.json`
  return [configPath, configFile]
}

export function readCache(projectRoot: string) {
  try {
    const [configPath, configFile] = toPaths(projectRoot)
    fs.ensureDirSync(configPath)
    const currentConfig = fs.readJSONSync(configFile) ?? {}
    return currentConfig as Cache
  } catch {
    return defaultConfig
  }
}

export function saveCache(projectRoot: string, changedConfig: Cache) {
  const [configPath, configFile] = toPaths(projectRoot)
  fs.ensureDirSync(configPath)
  const currentConfig = readCache(projectRoot)
  const finalConfig = { ...defaultConfig, ...currentConfig, ...changedConfig }
  fs.writeFileSync(configFile, JSON.stringify(finalConfig, null, 2))
}
