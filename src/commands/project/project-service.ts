import chalk from 'chalk'
import { input, prompt } from 'clifer'
import { config, saveConfig } from '../../config/config'
import { readEnvironment } from '../../environment/read-environment'
import { ProjectType, useMyProjectsQuery } from './use-projects'

type Project = Pick<ProjectType, 'id' | 'name'>

export function formatProject(project: Project | undefined, color = false) {
  if (!project) return color ? chalk.red('None') : 'None'
  if (!color) return `${project?.name} (${project?.id})`
  return chalk.yellow(`${project?.name} ${chalk.gray(`(${project?.id})`)}`)
}

export function selectProjectById(projects: Project[], projectId: string | undefined) {
  if (!projectId) return undefined
  return projects.find(project => project.id === projectId)
}

export async function chooseAProject(projects: Project[], currentProject?: Project) {
  const { project } = await prompt(
    input('project')
      .string()
      .prompt('Select a project:')
      .choices(projects.map(project => formatProject(project)) ?? [])
      .default(formatProject(currentProject)),
  )
  const [, projectId] = /.+\((.+)\)$/.exec(project) ?? []
  return selectProjectById(projects, projectId)
}

export async function showCurrentProject(projects: Project[]) {
  const currentProject = selectProjectById(projects, config.projectId)
  console.log(`\n→ Current project: ${formatProject(currentProject as any, true)}\n`)
  return currentProject
}

export function saveProject(projectId: string | undefined) {
  if (!projectId) return
  saveConfig({ projectId })
}

export async function switchProject() {
  const projects = await fetchProjects()
  const currentProject = selectProjectById(projects, config.projectId)
  if (!projects.length) {
    throw new Error(
      `You don't have any projects under your project. Visit ${config.remote?.replace(
        '/graphql',
        '',
      )} to create a new one`,
    )
  }
  const selectedProject = await chooseAProject(projects, currentProject)
  saveProject(selectedProject?.id)
}

export async function fetchProjects() {
  try {
    const results = await useMyProjectsQuery({ pagination: { limit: 200 } })
    return results.data.myProjects?.items ?? []
  } catch (e) {
    if (/You are unauthorized/.test(e.message)) {
      throw new Error(
        'Error: Unable to access projects. Make sure you are logged in to select a project using "hypergraph auth login".',
      )
    }
    throw e
  }
}

export async function resolveProject(props?: { projectId?: string }) {
  const env = await readEnvironment()
  const projects = await fetchProjects()
  let projectId = props?.projectId ?? env?.projectId
  if (!projectId) {
    const project = await chooseAProject(projects)
    if (!project) throw new Error('No project is selected!')
    projectId = project.id
  }
  let selectedProject = selectProjectById(projects, projectId)
  if (!selectedProject) throw new Error('Failed to select a project!')
  return selectedProject
}
