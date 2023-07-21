import { runCommand } from './run-command'
import { basename, resolve } from 'path'

export async function getProjectRoot(projectName?: string) {
  try {
    const [gitRoot] = await runCommand('git rev-parse --show-toplevel', { silent: true })
    if (projectName === undefined || basename(gitRoot) === projectName) return gitRoot
  } catch (e) {
    if (!/not a git repository/.test(e?.[0])) throw e
  }
  if (!projectName) throw new Error('Could not find the root of the project')
  return resolve(process.cwd(), projectName)
}
