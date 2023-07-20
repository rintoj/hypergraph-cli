import chalk from 'chalk'
import { command, input } from 'clifer'
import { ensureDir } from 'fs-extra'
import { toDashedName } from 'name-util'
import { basename, resolve } from 'path'
import { config } from '../../config/config'
import { runCommand } from '../../util/run-command'
import { writeSourceFiles } from '../../util/source-file-util'
import { readCache, saveCache } from '../cache/cache'
import {
  chooseAProject,
  fetchProjects,
  saveProject,
  selectProjectById,
} from '../project/project-service'
import { ProjectType } from '../project/use-projects'
import { useCheckoutQuery } from './use-checkout-query.gql'

interface Props {
  projectId?: string
  skipCache?: boolean
}

interface Context {
  projectId: string
  projectName: string
  projectRoot: string
}

async function getProjectRoot(projectName: string) {
  try {
    const [gitRoot] = await runCommand('git rev-parse --show-toplevel', { silent: true })
    if (basename(gitRoot) === projectName) return gitRoot
  } catch (e) {
    if (!/not a git repository/.test(e?.[0])) throw e
  }
  return resolve(process.cwd(), projectName)
}

async function createContext(project: ProjectType): Promise<Context> {
  if (!project.name) throw new Error('Project is missing a name. Can not checkout the project!')
  const projectName = toDashedName((project.name ?? '').toLowerCase())
  const projectRoot = await getProjectRoot(projectName)
  return {
    projectName,
    projectId: project.id,
    projectRoot,
  }
}

async function ensureProjectDir({ projectRoot }: Pick<Context, 'projectRoot'>) {
  await ensureDir(projectRoot)
  await runCommand('git init', { cwd: projectRoot, silent: true })
}

async function run({ projectId, skipCache }: Props) {
  try {
    const projects = await fetchProjects()
    let selectedProject = selectProjectById(projects, projectId ?? config.projectId)
    if (!projectId) {
      selectedProject = await chooseAProject(projects, selectedProject)
    }
    if (!selectedProject) throw new Error('Failed to select a project!')
    saveProject(selectedProject.id)

    const context = await createContext(selectedProject)
    const next = skipCache ? undefined : readCache(context.projectRoot)?.checkoutToken
    const checkoutResponse = await useCheckoutQuery({ projectId: selectedProject.id, next })
    const project = checkoutResponse.data.checkout.project
    await ensureProjectDir(context)
    await writeSourceFiles(context.projectRoot, project.sourceFiles)
    saveCache(context.projectRoot, { checkoutToken: checkoutResponse.data.checkout.next })
  } catch (e) {
    console.error(chalk.red(e.message))
  }
}

export default command<Props>('checkout')
  .description('Checkout a project')
  .option(input('projectId').description('Id of the project to checkout').string())
  .option(input('skipCache').description('Disable cache. By default it is enabled'))
  .handle(run)
