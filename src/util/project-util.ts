import { sync } from 'fast-glob'
import { ensureDir, readFile, writeFile } from 'fs-extra'
import { compile } from 'handlebars'
import { basename, dirname, resolve } from 'path'

export function listServices(projectRoot: string) {
  const serviceNames = listFiles(`${projectRoot}/services`, '*', 'deployment*.{yaml,yml}').map(
    serviceNameFromPath,
  )
  return Array.from(new Set(serviceNames))
}

export function serviceNameFromPath(file: string) {
  return basename(dirname(file)).replace('-service', '')
}

export function listPackages(packageRoot: string) {
  return listDirectories(packageRoot, '*').map(folder => basename(folder).replace('-package', ''))
}

export function listFiles(root: string, ...patterns: string[]) {
  return sync(resolve(root, ...patterns), { onlyFiles: true })
}

export function listDirectories(root: string, ...patterns: string[]) {
  return sync(resolve(root, ...patterns), { onlyDirectories: true })
}

export function toRelativePathFromProjectRoot(fileName: string, projectRoot: string) {
  return fileName.replace(projectRoot + '/', '')
}

export function resolveTemplate(template: string, data: Record<string, any>) {
  return compile(template)(data)
}

export async function writeFileWithTemplate(
  templateFile: string,
  targetFile: string,
  data: Record<string, any>,
) {
  const template = await readFile(templateFile, 'utf8')
  const content = resolveTemplate(template, data)
  await ensureDir(dirname(targetFile))
  await writeFile(targetFile, content, 'utf8')
}

export async function readPackageJSON(root: string) {
  try {
    const content = await readFile(`${root}/package.json`, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    return undefined
  }
}
