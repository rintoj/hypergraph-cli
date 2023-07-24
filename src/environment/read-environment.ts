import { getGitRoot, getProjectRoot } from '../util/get-project-root'
import { readPackageJSON } from '../util/project-util'

export interface ProjectContext {
  projectId: string
  projectName: string
  projectRoot: string
}

export async function readEnvironment(): Promise<ProjectContext | undefined> {
  const projectRoot = await getGitRoot()
  if (!projectRoot) return
  const { projectId, projectName } =
    (await readPackageJSON(`${projectRoot}/backend`))?.hypergraph ?? {}
  return {
    projectName,
    projectId,
    projectRoot,
  }
}
