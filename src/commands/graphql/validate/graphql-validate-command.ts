import { command, input } from 'clifer'
import * as path from 'path'
import chalk from 'chalk'
import { GraphQLValidator, ValidationRules, ValidationResult } from './graphql-validator'

interface Props {
  path?: string
  fix?: boolean
  strict?: boolean
  json?: boolean
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

  if (!json) {
    console.log(chalk.blue('🔍 Starting GraphQL structure validation...\n'))
    console.log(chalk.gray(`Validating: ${rootPath}`))
    console.log(chalk.gray(`Mode: ${strict ? 'strict' : 'normal'}\n`))
  }

  const validator = new GraphQLValidator(rootPath, rules)
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
  console.log(chalk.blue('━'.repeat(60)))
  console.log(chalk.blue.bold('\n📊 Validation Summary\n'))

  // Display module information
  if (result.modules.length > 0) {
    console.log(chalk.white(`📦 Modules found: ${result.modules.length}`))
    result.modules.forEach(module => {
      console.log(chalk.gray(`   • ${module}`))
    })
    console.log()
  }

  console.log(chalk.white(`📄 Files checked: ${result.checkedFiles}`))

  // Only show error count if there are errors
  if (result.errors.length > 0) {
    console.log(chalk.red(`❌ Errors: ${result.errors.length}`))
  }

  // Only show warning count if there are warnings
  if (result.warnings.length > 0) {
    console.log(chalk.yellow(`⚠️  Warnings: ${result.warnings.length}`))
  }

  console.log()

  // Display errors
  if (result.errors.length > 0) {
    console.log(chalk.red.bold('❌ Errors:\n'))
    result.errors.forEach((error, index) => {
      console.log(chalk.red(`${index + 1}. [${error.rule}] ${error.file}`))
      console.log(chalk.red(`   ${error.message}`))
      if (error.line) {
        console.log(chalk.gray(`   Line: ${error.line}`))
      }
      console.log()
    })
  }

  // Display warnings
  if (result.warnings.length > 0) {
    console.log(chalk.yellow.bold('⚠️  Warnings:\n'))
    result.warnings.forEach((warning, index) => {
      console.log(chalk.yellow(`${index + 1}. [${warning.rule}] ${warning.file}`))
      console.log(chalk.yellow(`   ${warning.message}`))
      if (warning.line) {
        console.log(chalk.gray(`   Line: ${warning.line}`))
      }
      console.log()
    })
  }

  // Display validation rules
  console.log(chalk.blue('━'.repeat(60)))
  console.log(chalk.blue.bold('\n📋 Validation Rules Applied:\n'))

  const ruleDescriptions = [
    '✓ All GraphQL inputs must be in .input.ts files',
    '✓ All responses must be in .response.ts files',
    '✓ All models (TypeORM & GraphQL) must be in .model.ts files',
    '✓ Module files must follow naming convention: <module>/<module>.module.ts',
    '✓ All resolvers must be in .resolver.ts files',
    '✓ All services must be in .service.ts files',
    '✓ All GraphQL endpoints must be in resolver files',
    '✓ @hgraph/storage: Entities use @Entity, @PrimaryColumn, @Column decorators',
    '✓ @hgraph/storage: Repositories extend proper base classes',
    '✓ @hgraph/storage: Services use @InjectRepo for dependency injection',
    '✓ @hgraph/storage: Modules import StorageModule correctly',
  ]

  ruleDescriptions.forEach(rule => {
    console.log(chalk.gray(rule))
  })

  console.log(chalk.blue('\n' + '━'.repeat(60)))

  // Final status
  if (result.valid) {
    console.log(chalk.green.bold('\n✅ All validations passed!\n'))
  } else if (result.errors.length === 0 && !strict) {
    console.log(chalk.yellow.bold('\n⚠️  Validation completed with warnings.\n'))
    console.log(chalk.gray('Use --strict flag to treat warnings as errors.\n'))
  } else {
    console.log(chalk.red.bold('\n❌ Validation failed!\n'))
    console.log(chalk.gray('Please fix the errors listed above.\n'))
  }
}

export default command<Props>('validate')
  .description('Validate GraphQL module structure and naming conventions')
  .option(
    input('path').description('Path to the project root (defaults to current directory)').string(),
  )
  .option(input('fix').description('Automatically fix issues where possible (not implemented yet)'))
  .option(input('strict').description('Treat warnings as errors'))
  .option(input('json').description('Output results as JSON'))
  .handle(run)
