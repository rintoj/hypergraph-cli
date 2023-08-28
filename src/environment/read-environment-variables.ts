import { readFile } from 'fs-extra'
import jsYaml from 'js-yaml'
import { getProjectRoot, listFiles, resolveFileByEnvironment } from '../util'

export async function readEnvironmentVariables(environmentFiles: string[]) {
  const files = await Promise.all(
    environmentFiles.map(environmentFile => readFile(environmentFile, 'utf-8')),
  )
  return files
    .flatMap(content => jsYaml.loadAll(content))
    .map((content: any) => content?.data ?? {})
    .reduce((a, i) => ({ ...a, ...i }), {})
}

export async function readEnv(environment: string) {
  const projectRoot = `${(await getProjectRoot()) ?? ''}/backend`
  const environmentFiles = resolveFileByEnvironment(
    listFiles(projectRoot, 'env*.{yaml,yml}'),
    environment,
  )
  return await readEnvironmentVariables(environmentFiles)
}
