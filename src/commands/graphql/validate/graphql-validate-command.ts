import { command, input } from 'clifer'
import * as path from 'path'
import chalk from 'chalk'
// import { GraphQLValidator, ValidationRules, ValidationResult } from './graphql-validator'
import { GraphQLASTValidator, ValidationRules, ValidationResult } from './graphql-ast-validator'

interface Props {
  path?: string
  fix?: boolean
  strict?: boolean
  json?: boolean
}

// Syntax highlighting for TypeScript code
function highlightTypeScriptSyntax(code: string): string {
  // Keywords
  const keywords = /\b(import|export|class|interface|function|async|await|const|let|var|if|else|for|while|return|extends|implements|public|private|protected|readonly|static|new|this|super|typeof|instanceof|in|of|as|from)\b/g

  // Decorators
  const decorators = /@\w+/g

  // Strings
  const strings = /(['"`])(?:(?=(\\?))\2.)*?\1/g

  // Comments
  const comments = /\/\/.*$/gm

  // Numbers
  const numbers = /\b\d+\b/g

  // Types and classes
  const types = /\b[A-Z]\w*\b/g

  let highlighted = code

  // Apply highlighting in order of precedence
  highlighted = highlighted.replace(strings, chalk.green('$&'))
  highlighted = highlighted.replace(comments, chalk.gray('$&'))
  highlighted = highlighted.replace(decorators, chalk.magenta('$&'))
  highlighted = highlighted.replace(keywords, chalk.blue('$&'))
  highlighted = highlighted.replace(types, chalk.yellow('$&'))
  highlighted = highlighted.replace(numbers, chalk.cyan('$&'))

  return highlighted
}

async function run({ path: targetPath, fix, strict, json }: Props) {
  const rootPath = targetPath ? path.resolve(targetPath) : process.cwd()

  // Define validation rules based on strict mode
  const rules: ValidationRules = {
    checkInputFiles: true,
    checkResponseFiles: true,
    checkModelFiles: true,
    checkModuleNaming: true,
    checkResolverFiles: true,
    checkServiceFiles: true,
    checkResolverEndpoints: true,
    checkHgraphStorage: true,
    checkEntityFiles: true,
    checkRepositoryFiles: true,
  }

  const validator = new GraphQLASTValidator(rootPath, rules)
  const result: ValidationResult = await validator.validate()

  if (json) {
    // Output as JSON for CI/CD integration
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.valid ? 0 : 1)
  }

  // Display results in human-readable format
  displayResults(result, strict || false)

  // Exit with appropriate code
  process.exit(result.valid || (!strict && result.errors.length === 0) ? 0 : 1)
}

function displayResults(result: ValidationResult, strict: boolean) {
  // Summary line
  if (result.errors.length > 0 || result.warnings.length > 0) {
    const parts = []
    if (result.errors.length > 0) {
      parts.push(chalk.red(`${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`))
    }
    if (result.warnings.length > 0) {
      parts.push(chalk.yellow(`${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}`))
    }
    console.log(`\nFound ${parts.join(' and ')}\n`)
  }

  // Display errors
  if (result.errors.length > 0) {
    result.errors.forEach((error, index) => {
      // File and location
      console.log(chalk.cyan.underline(`${error.file}${error.line ? ':' + error.line : ''}`))

      // Error message with rule
      console.log(`  ${chalk.red('✖')} ${error.message} ${chalk.gray(`[${error.rule}]`)}`)

      // Code snippet with syntax highlighting
      if (error.snippet) {
        console.log()
        error.snippet.split('\n').forEach(line => {
          const lineMatch = line.match(/^([>|\s])\s*(\d+)\s\|\s(.*)$/)
          if (lineMatch) {
            const [, indicator, lineNum, code] = lineMatch
            const highlightedCode = highlightTypeScriptSyntax(code)
            if (indicator === '>') {
              console.log(chalk.red(`${indicator}${lineNum} │`) + ' ' + highlightedCode)
            } else {
              console.log(chalk.gray(` ${lineNum} │`) + ' ' + highlightedCode)
            }
          }
        })
      }
      console.log()
    })
  }

  // Display warnings
  if (result.warnings.length > 0) {
    result.warnings.forEach((warning, index) => {
      // File and location
      console.log(chalk.cyan.underline(`${warning.file}${warning.line ? ':' + warning.line : ''}`))

      // Warning message with rule
      console.log(`  ${chalk.yellow('⚠')} ${warning.message} ${chalk.gray(`[${warning.rule}]`)}`)

      // Code snippet with syntax highlighting
      if (warning.snippet) {
        console.log()
        warning.snippet.split('\n').forEach(line => {
          const lineMatch = line.match(/^([>|\s])\s*(\d+)\s\|\s(.*)$/)
          if (lineMatch) {
            const [, indicator, lineNum, code] = lineMatch
            const highlightedCode = highlightTypeScriptSyntax(code)
            if (indicator === '>') {
              console.log(chalk.yellow(`${indicator}${lineNum} │`) + ' ' + highlightedCode)
            } else {
              console.log(chalk.gray(` ${lineNum} │`) + ' ' + highlightedCode)
            }
          }
        })
      }
      console.log()
    })
  }


  // Final status
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(chalk.green('\n✓ All checks passed\n'))
  } else if (result.errors.length === 0 && result.warnings.length > 0 && !strict) {
    console.log(chalk.yellow('\n⚠ Validation completed with warnings'))
    console.log(chalk.gray('  Use --strict to treat warnings as errors\n'))
  } else {
    console.log(chalk.red('\n✖ Validation failed'))
    console.log(chalk.gray('  Fix the issues above to pass validation\n'))
  }
}

export default command<Props>('validate')
  .description('Validate GraphQL module structure and naming conventions')
  .option(
    input('path')
      .description('Path to the project root (defaults to current directory)')
      .string()
  )
  .option(
    input('fix')
      .description('Automatically fix issues where possible (not implemented yet)')
  )
  .option(
    input('strict')
      .description('Treat warnings as errors')
  )
  .option(
    input('json')
      .description('Output results as JSON')
  )
  .handle(run)