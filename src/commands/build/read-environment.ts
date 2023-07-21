import jsYaml from 'js-yaml'
import { readFile } from 'fs-extra'
import { listFiles } from '../../util/project-util'
import { resolveFileByEnvironment } from '../../util/resolve-file-by-environment'

export async function readEnvironmentVariables(projectRoot: string, environment: string) {
  const environmentFiles = resolveFileByEnvironment(
    listFiles(projectRoot, 'env*.{yaml,yml}'),
    environment,
  )
  const files = await Promise.all(
    environmentFiles.map(environmentFile => readFile(environmentFile, 'utf-8')),
  )
  return files
    .flatMap(content => jsYaml.loadAll(content))
    .map((content: any) => content?.data ?? {})
    .reduce((a, i) => ({ ...a, ...i }), {})
}
