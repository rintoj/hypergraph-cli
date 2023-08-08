import { green, red, yellow } from 'chalk'
import { ensureDir, exists, readFile, readdir, rm, rmdir, writeFile } from 'fs-extra'
import { basename, dirname, extname, resolve } from 'path'
import { format } from 'prettier'
import { SourceFileStatus, SourceFileType } from '../commands/checkout/use-checkout-query.gql'

async function shouldIgnoreFile(file: string) {
  const hasFile = await exists(file)
  if (!hasFile) return false
  const content = await readFile(file, 'utf-8')
  return content.split('\n').find(line => /@hg-ignore/.test(line)) !== undefined
}
export function prettify(code: string) {
  return format(code, {
    arrowParens: 'avoid',
    bracketSpacing: true,
    endOfLine: 'lf',
    htmlWhitespaceSensitivity: 'css',
    jsxSingleQuote: true,
    printWidth: 100,
    proseWrap: 'always',
    requirePragma: false,
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
    useTabs: false,
    parser: 'typescript',
  } as any)
}

async function deleteFile(file: string) {
  await rm(file)
  console.log(`${red('[DELETE]')} ${file}`)
  let dirName = dirname(file)
  let maxDepth = 10
  try {
    while (!/(\/src|.+-service)$/.test(dirName) && maxDepth-- > 0) {
      if ((await readdir(dirName)).length > 0) return
      await rmdir(dirName)
      dirName = dirname(dirName)
    }
  } catch (e) {
    //ignore
  }
}

export function writeSourceFiles(root: string, sourceFiles: Array<SourceFileType>) {
  return Promise.all(
    sourceFiles.map(async sourceFile => {
      const dir = resolve(root, dirname(sourceFile.fileName))
      const file = resolve(dir, basename(sourceFile.fileName))
      if ((await shouldIgnoreFile(file)) === true) return
      const fileExists = (await exists(file)) === true

      // delete file
      if (sourceFile.status === SourceFileStatus.DELETED) {
        if (fileExists) await deleteFile(file)
        return { ...sourceFile, content: [] }
      }

      // update or create file
      await ensureDir(dir)
      console.log(`${fileExists ? yellow('[UPDATE]') : green('[CREATE]')} ${sourceFile.fileName}`)
      const extension = extname(file)
      const fileContent = sourceFile.content.join('\n')
      const content = extension === '.ts' ? await prettify(fileContent) : fileContent
      await writeFile(file, content, 'utf-8')
      return { ...sourceFile, content: content.split('\n') }
    }),
  )
}
