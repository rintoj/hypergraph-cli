function toNameAndExtension(fileName: string): [string, string | undefined] {
  const parts = fileName.split('.')
  if (parts.length <= 1) [fileName, undefined]
  return [parts.slice(0, -1).join('.'), parts.slice(-1)[0]]
}

function fileNameWithoutEnvExt(fileName: string) {
  const parts = fileName.split('.')
  if (parts.length <= 2) return fileName
  return [...parts.slice(0, -2), ...parts.slice(-1)].join('.')
}

function hasEnvironmentExt(fileName: string) {
  const parts = fileName.split('.')
  return parts.length > 2
}

export function resolveFileByEnvironment(files: string[], environment: string) {
  const fileByKey = Object.fromEntries(files.map(name => [name, name]))
  return files.filter(file => {
    const [name, ext] = toNameAndExtension(file)
    const environmentFile = [fileNameWithoutEnvExt(name), environment, ext].join('.')
    if (!file.includes(`.${environment}.`)) {
      if (hasEnvironmentExt(file)) return false
      return !fileByKey[environmentFile]
    }
    return true
  })
}
