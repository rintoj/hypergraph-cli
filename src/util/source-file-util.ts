import { green, yellow } from 'chalk'
import { ensureDir, exists, readFile, writeFile } from 'fs-extra'
import { basename, dirname, extname, resolve } from 'path'
import { format } from 'prettier'

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

export function writeSourceFiles(
  root: string,
  sourceFiles: Array<{ fileName: string; content: string[] }>,
) {
  return Promise.all(
    sourceFiles.map(async sourceFile => {
      const dir = resolve(root, dirname(sourceFile.fileName))
      const file = resolve(dir, basename(sourceFile.fileName))
      if ((await shouldIgnoreFile(file)) === true) return
      const fileExists = (await exists(file)) === true
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
