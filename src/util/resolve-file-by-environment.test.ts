import { resolveFileByEnvironment } from './resolve-file-by-environment'

describe('resolveFileByEnvironment', () => {
  test('should return an env specific file only even if a generic file exists', () => {
    const files = resolveFileByEnvironment(
      ['/build/test.dev.json', '/build/sample.json', '/build/test.json'],
      'dev',
    )
    expect(files).toEqual(['/build/test.dev.json', '/build/sample.json'])
  })

  test('should return an env specific file only even if files for other envs exist', () => {
    const files = resolveFileByEnvironment(
      [
        '/build/test.dev.json',
        '/build/sample.json',
        '/build/test.json',
        '/build/test.prod.json',
        '/build/test.local.json',
      ],
      'dev',
    )
    expect(files).toEqual(['/build/test.dev.json', '/build/sample.json'])
  })

  test.only('should return an env specific file only even if files for other envs exist', () => {
    const files = resolveFileByEnvironment(
      ['/build/test.dev', '/build/test.prod', '/build/test.local'],
      'dev',
    )
    expect(files).toEqual(['/build/test.dev'])
  })

  test('should return an generic file if no environment specific file exists', () => {
    const files = resolveFileByEnvironment(
      ['/build/sample.json', '/build/test.json', '/build/test.prod.json', '/build/test.local.json'],
      'dev',
    )
    expect(files).toEqual(['/build/sample.json', '/build/test.json'])
  })

  test('should not return files specific to other environments', () => {
    const files = resolveFileByEnvironment(
      ['/build/sample.json', '/build/test.prod.json', '/build/test.local.json'],
      'dev',
    )
    expect(files).toEqual(['/build/sample.json'])
  })
})
