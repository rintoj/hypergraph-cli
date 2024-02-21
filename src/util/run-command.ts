import { yellow } from 'chalk'
import { exec } from 'shelljs'

interface Options {
  silent?: boolean
  fatal?: boolean
  cwd?: string
}

function showCommand(command: string) {
  console.log(
    yellow(
      `\n$ ${command
        .split(/\n|\s/)
        .map(i => i.trim())
        .filter(i => !!i)
        .join(' ')}`,
    ),
  )
}

export async function isValidCommand(command: string) {
  const [response] = await runCommand(`which ${command}`, { silent: true })
  if (response.includes('not found')) return false
  return true
}

export async function ifValidCommand(command: string) {
  if (!(await isValidCommand(command))) return
  return command
}

export function runCommand(
  command: string,
  { fatal = true, silent = false, cwd = process.cwd() }: Options = {},
) {
  if (!silent) showCommand(command)
  return new Promise<string[]>((resolve, reject) => {
    exec(command, { silent, fatal, cwd }, async (code, stdout, stderr) => {
      if (code !== 0) {
        reject((stderr ?? stdout ?? '').split('\n'))
      } else {
        resolve((stdout ?? stderr ?? '').split('\n'))
      }
    })
  })
}
