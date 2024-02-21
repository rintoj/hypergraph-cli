import { highlight } from 'cli-highlight'
import { Spinner } from 'cli-spinner'
import { command, input, prompt } from 'clifer'
import { ensureDir, readFile } from 'fs-extra'
import { toDashedName } from 'name-util'
import { ProjectContext } from '../../environment/read-environment'
import { resolveProject } from '../../project/project-service'
import { withErrorHandler } from '../../util/error-handler'
import { getProjectRoot } from '../../util/get-project-root'
import { runCommand } from '../../util/run-command'
import { writeSourceFiles } from '../../util/source-file-util'
import { saveSourceFiles } from '../save/save-command'
import { ProjectType, SourceFileType, useGenerateQuery } from './use-generate-query.gql'
import { basename } from 'path'

interface Props {
  projectId?: string
  file?: string
}

async function withSpinner<T>(callback: () => Promise<T>) {
  const spinner = new Spinner({
    text: 'Processing.. %s',
    stream: process.stderr,
    onTick: function (msg) {
      this.clearLine(this.stream)
      this.stream.write(msg)
    },
  })
  spinner.start()
  const response = await callback()
  spinner.stop(true)
  return response
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

async function generate(
  prompt: string,
  history: string | undefined,
  context: ProjectContext,
): Promise<{ project?: ProjectType; history?: string }> {
  return await withSpinner(async () =>
    withErrorHandler(async () => {
      const response = await useGenerateQuery({
        input: { projectId: context.projectId, prompt, history },
      })
      return response.data.generate
    }),
  )
}

function showProject(project: ProjectType | undefined) {
  console.log('')
  if (!project) return
  console.log(
    highlight(
      project?.sourceFiles
        ?.map(sourceFile => [`// ${sourceFile.fileName}`, ...sourceFile.content].join('\n'))
        .join('\n') ?? '',
      { language: 'typescript' },
    ),
  )
  console.log('')
  console.log('Tip: Type "save" to save your work or "exit" to finish up!')
}

async function save(sourceFiles: SourceFileType[], context: ProjectContext) {
  return withErrorHandler(async () => {
    await ensureProjectDir(context)
    await writeSourceFiles(context.projectRoot, sourceFiles as any)
    const sourceFile =
      sourceFiles?.length > 1
        ? `**/{${sourceFiles?.map(sourceFile => basename(sourceFile.fileName)).join(',')}}`
        : sourceFiles?.[0]?.fileName?.replace('backend/', '')
    await saveSourceFiles({ projectId: context.projectId, sourceFile })
  })
}

async function runGenerate(props: Props) {
  return withErrorHandler(async () => {
    const selectedProject = await resolveProject(props)
    const projectContext = await createContext(selectedProject as any)
    let response: { project?: ProjectType; response?: string } = {}
    let initialPrompt = props.file ? await readFile(props.file, 'utf8') : undefined
    do {
      let { project } = response
      const { ask } = initialPrompt
        ? { ask: initialPrompt }
        : await prompt(input('ask').prompt('Ask AI').string())
      if (ask.trim() === '') {
        continue
      } else if (ask.trim().toLowerCase() === 'exit') {
        break
      } else if (ask.trim().toLowerCase() === 'save') {
        if (!project) {
          console.log('Nothing to save')
        } else {
          await save(project.sourceFiles, projectContext)
        }
        continue
      }
      response = await generate(ask, response.response, projectContext)
      showProject(response.project)
      initialPrompt = undefined
    } while (true)
  })
}

export default command<Props>('generate')
  .description('Generate project models and resolvers using AI')
  .option(input('projectId').description('Specify the ID of the project').string())
  .option(input('file').description('Load prompt from a file').string())
  .handle(runGenerate)
