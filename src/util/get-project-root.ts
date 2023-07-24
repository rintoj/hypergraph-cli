import { basename, resolve } from 'path'
import { runCommand } from './run-command'

export async function getGitRoot() {
  try {
    const [gitRoot] = await runCommand('git rev-parse --show-toplevel', { silent: true })
    return gitRoot
  } catch (e) {
    if (!/not a git repository/.test(e?.[0])) throw e
  }
}

export async function getProjectRoot(projectName?: string) {
  const gitRoot = await getGitRoot()
  if (gitRoot && (projectName === undefined || basename(gitRoot) === projectName)) return gitRoot
  if (!projectName) throw new Error('Could not find the root of the project')
  return resolve(process.cwd(), projectName)
}
