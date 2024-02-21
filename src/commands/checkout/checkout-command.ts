import { command, input } from 'clifer'
import { ensureDir, existsSync } from 'fs-extra'
import { toDashedName } from 'name-util'
import path from 'path'
import { readCache, saveCache } from '../../cache/cache'
import { ProjectContext } from '../../environment/read-environment'
import { resolveProject } from '../../project/project-service'
import { withErrorHandler } from '../../util/error-handler'
import { getProjectRoot } from '../../util/get-project-root'
import { ifValidCommand, runCommand } from '../../util/run-command'
import { writeSourceFiles } from '../../util/source-file-util'
import { ProjectType, useCheckoutQuery } from './use-checkout-query.gql'

interface Props {
  projectId?: string
  skipCache?: boolean
  open?: boolean
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

async function commit({ projectRoot }: Pick<ProjectContext, 'projectRoot'>) {
  await runCommand('git add --all', { cwd: projectRoot, silent: true })
  await runCommand('git commit -m "Initial commit"', { cwd: projectRoot, silent: true })
}

async function saveAllHypergraphFiles({ projectRoot }: Pick<ProjectContext, 'projectRoot'>) {
  try {
    await runCommand(`hypergraph save '**/*.hg.ts'`, {
      cwd: path.resolve(projectRoot, 'backend'),
      silent: false,
    })
  } catch (e) {
    console.error(e)
  }
}

async function installDependencies({ projectRoot }: Pick<ProjectContext, 'projectRoot'>) {
  try {
    const installer = (await ifValidCommand('yarn')) ?? (await ifValidCommand('npm'))
    if (!installer) return
    await runCommand(`${installer} install`, {
      cwd: path.resolve(projectRoot, 'backend'),
      silent: false,
    })
  } catch (e) {
    console.error(e)
  }
}

export async function runCheckout({ open, skipCache, ...props }: Props) {
  return withErrorHandler(async () => {
    const selectedProject = await resolveProject(props)
    const context = await createContext(selectedProject as any)
    const next = skipCache ? undefined : readCache(context.projectRoot)?.checkoutToken
    const checkoutResponse = await useCheckoutQuery({ projectId: selectedProject.id, next })
    const project = checkoutResponse.data.checkout.project
    const isFirstRun = !existsSync(path.resolve(context.projectRoot, '.git'))
    if (isFirstRun) await ensureProjectDir(context)
    await writeSourceFiles(context.projectRoot, project.sourceFiles)
    saveCache(context.projectRoot, { checkoutToken: checkoutResponse.data.checkout.next })
    if (isFirstRun) {
      await saveAllHypergraphFiles(context)
      await installDependencies(context)
      await commit(context)
    }
    if (open) {
      runCommand(`open ${context.projectRoot}/${toDashedName(project.name ?? '')}.code-workspace`)
    }
  })
}

export default command<Props>('checkout')
  .description('Checkout a project')
  .option(input('projectId').description('Specify the ID of the project to checkout').string())
  .option(input('skipCache').description('Disable cache (enabled by default)'))
  .option(input('open').description('Open the project once it has been checked out'))
  .handle(runCheckout)
