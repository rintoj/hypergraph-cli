import { sync } from 'fast-glob'
import { readFile } from 'fs-extra'
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
  return sync(resolve(root, ...patterns), { dot: true, onlyFiles: true })
}

export function listDirectories(root: string, ...patterns: string[]) {
  return sync(resolve(root, ...patterns), { onlyDirectories: true })
}

export function toRelativePathFromProjectRoot(fileName: string, projectRoot: string) {
  return fileName.replace(projectRoot + '/', '')
}

export async function readPackageJSON(root: string) {
  try {
    const content = await readFile(`${root}/package.json`, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    return undefined
  }
}
