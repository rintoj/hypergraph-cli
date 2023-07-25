import chalk from 'chalk'
import { command, input } from 'clifer'
import { ensureDir } from 'fs-extra'
import { toDashedName } from 'name-util'
import { ProjectContext } from '../../environment/read-environment'
import { getProjectRoot } from '../../util/get-project-root'
import { runCommand } from '../../util/run-command'
import { writeSourceFiles } from '../../util/source-file-util'
import { readCache, saveCache } from '../cache/cache'
import { resolveProject } from '../../project/project-service'
import { ProjectType, useCheckoutQuery } from './use-checkout-query.gql'

interface Props {
  projectId?: string
  skipCache?: boolean
}

async function createContext(project: ProjectType): Promise<ProjectContext> {
  if (!project.name) throw new Error('Project is missing a name. Can not checkout the project!')
  const projectName = toDashedName((project.name ?? '').toLowerCase())
  const projectRoot = await getProjectRoot(projectName)
  return {
    projectName,
    projectId: project.id,
    projectRoot,
  }
}

async function ensureProjectDir({ projectRoot }: Pick<ProjectContext, 'projectRoot'>) {
  await ensureDir(projectRoot)
  await runCommand('git init', { cwd: projectRoot, silent: true })
}

async function run({ skipCache, ...props }: Props) {
  try {
    const selectedProject = await resolveProject(props)
    const context = await createContext(selectedProject as any)
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
