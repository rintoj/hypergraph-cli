import chalk from 'chalk'
import { command, input } from 'clifer'
import { ensureDir } from 'fs-extra'
import { toDashedName } from 'name-util'
import { resolve } from 'path'
import { config } from '../../config/config'
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

async function createContext(project: ProjectType): Promise<Context> {
  if (!project.name) throw new Error('Project is missing a name. Can not checkout the project!')
  const projectName = toDashedName((project.name ?? '').toLowerCase())
  console.log(projectName)
  return {
    projectName,
    projectId: project.id,
    projectDir: resolve(process.cwd(), projectName),
  }
}

async function ensureProjectDir({ projectDir }: Pick<Context, 'projectDir'>) {
  await ensureDir(projectDir)
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
