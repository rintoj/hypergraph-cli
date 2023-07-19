import chalk from 'chalk'
import { command, input } from 'clifer'
import { ensureDir } from 'fs-extra'
import { toDashedName } from 'name-util'
import { basename, resolve } from 'path'
import { config } from '../../config/config'
import { runCommand } from '../../util/run-command'
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
}

interface Context {
  projectId: string
  projectName: string
  projectDir: string
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
  const projectDir = await getProjectRoot(projectName)
  return {
    projectName,
    projectId: project.id,
    projectDir,
  }
}

async function ensureProjectDir({ projectDir }: Pick<Context, 'projectDir'>) {
  await ensureDir(projectDir)
  await runCommand('git init', { cwd: projectDir, silent: true })
}

async function selectProject(projectId: string | undefined) {
  const projects = await fetchProjects()
  const currentProject = selectProjectById(projects, config.projectId)
  const selectedProject = projectId
    ? selectProjectById(projects, projectId)
    : await chooseAProject(projects, currentProject)
  if (projectId && !selectedProject) {
    throw new Error(`Project id "${projectId}" is an invalid one`)
  }
  if (!selectedProject) {
    throw new Error('No project selected!')
  }
  const checkoutResponse = await useCheckoutQuery({ projectId: selectedProject.id })
  const project = checkoutResponse.data.checkout
  saveProject(project.id)
  return project
}

async function run({ projectId }: Props) {
  try {
    const project = await selectProject(projectId)
    const context = await createContext(project)
    await ensureProjectDir(context)
    console.log(project.sourceFiles)
  } catch (e) {
    console.error(chalk.red(e.message))
  }
}

export default command<Props>('checkout')
  .description('Checkout a project')
  .option(input('projectId').description('Id of the project to checkout').string())
  .handle(run)
