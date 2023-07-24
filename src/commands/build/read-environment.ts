import { readFile } from 'fs-extra'
import jsYaml from 'js-yaml'

export async function readEnvironmentVariables(environmentFiles: string[]) {
  const files = await Promise.all(
    environmentFiles.map(environmentFile => readFile(environmentFile, 'utf-8')),
  )
  return files
    .flatMap(content => jsYaml.loadAll(content))
    .map((content: any) => content?.data ?? {})
    .reduce((a, i) => ({ ...a, ...i }), {})
}
