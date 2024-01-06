import { readFile } from 'fs-extra'
import jsYaml from 'js-yaml'
import { config } from 'dotenv'
import { getProjectRoot, listFiles, resolveFileByEnvironment } from '../util'

export async function readEnvironmentYAML(environmentFiles: string[]) {
  const files = await Promise.all(
    environmentFiles.map(environmentFile => readFile(environmentFile, 'utf-8')),
  )
  return files
    .flatMap(content => jsYaml.loadAll(content))
    .map((content: any) => content?.data ?? {})
    .reduce((a, i) => ({ ...a, ...i }), {})
}

export async function readEnvironmentVariables(
  environmentFiles: string[],
): Promise<Record<string, string>> {
  const yamlFiles = environmentFiles.filter(file => /\.ya?ml/.test(file))
  const envFiles = environmentFiles.filter(file => !/\.ya?ml/.test(file))
  return envFiles
    .map(file => config({ path: file })?.parsed)
    .reduce((a, i) => ({ ...a, ...i }), await readEnvironmentYAML(yamlFiles)) as Record<
    string,
    string
  >
}

export async function readEnv(environment: string) {
  const projectRoot = `${(await getProjectRoot()) ?? ''}/backend`
  const environmentFiles = resolveFileByEnvironment(
    listFiles(projectRoot, 'env*.{yaml,yml}'),
    environment,
  )
  return await readEnvironmentVariables(environmentFiles)
}
