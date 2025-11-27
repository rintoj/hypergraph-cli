import * as ts from 'typescript'
import * as path from 'path'
import * as fs from 'fs'
import { glob } from 'glob'
import ignore from 'ignore'

export interface ValidationError {
  file: string
  line?: number
  rule: string
  message: string
  severity: 'error' | 'warning'
  snippet?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  checkedFiles: number
  modules: string[]
}

export interface ValidationRules {
  checkInputFiles: boolean
  checkResponseFiles: boolean
  checkModelFiles: boolean
  checkModuleNaming: boolean
  checkResolverFiles: boolean
  checkServiceFiles: boolean
  checkResolverEndpoints: boolean
  checkHgraphStorage: boolean
  checkEntityFiles: boolean
  checkRepositoryFiles: boolean
  checkTypeOrmModule: boolean
  checkTypeOnlyImports: boolean
  checkUnderscorePropertyUsage: boolean
  // Individual file naming checks
  checkModelFileNaming: boolean
  checkServiceFileNaming: boolean
  checkResolverFileNaming: boolean
  checkInputFileNaming: boolean
  checkResponseFileNaming: boolean
  checkModuleFileNaming: boolean
  checkEnumFileNaming: boolean
  checkUtilFileNaming: boolean
  checkTestFileNaming: boolean
  checkRepositoryFileNaming: boolean
  // Class name validation
  checkServiceClassName: boolean
  checkResolverClassName: boolean
  checkRepositoryClassName: boolean
}

/**
 * Convert a file name to PascalCase class name
 * Examples:
 *   - user.service.ts → User
 *   - user-profile.service.ts → UserProfile
 *   - user-article-rating.resolver.ts → UserArticleRating
 */
function fileNameToClassName(fileName: string, suffix: string): string {
  // Remove the suffix (e.g., .service.ts, .resolver.ts)
  const baseName = fileName.replace(new RegExp(`\\.${suffix}\\.ts$`), '')

  // Convert kebab-case to PascalCase
  return baseName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

// File types that should follow naming conventions
export type ValidatedFileType =
  | 'model'
  | 'service'
  | 'resolver'
  | 'input'
  | 'response'
  | 'module'
  | 'enum'
  | 'util'
  | 'test'
  | 'repository'

// Configuration for each file type's naming validation
interface FileTypeConfig {
  suffix: string
  errorCode: string
  severity: 'error' | 'warning'
}

const FILE_TYPE_CONFIGS: Record<ValidatedFileType, FileTypeConfig> = {
  model: { suffix: '.model', errorCode: 'model-naming', severity: 'error' },
  service: { suffix: '.service', errorCode: 'service-naming', severity: 'error' },
  resolver: { suffix: '.resolver', errorCode: 'resolver-naming', severity: 'error' },
  input: { suffix: '.input', errorCode: 'input-naming', severity: 'error' },
  response: { suffix: '.response', errorCode: 'response-naming', severity: 'error' },
  module: { suffix: '.module', errorCode: 'module-naming', severity: 'error' },
  enum: { suffix: '.enum', errorCode: 'enum-naming', severity: 'error' },
  util: { suffix: '.util', errorCode: 'util-naming', severity: 'error' },
  test: { suffix: '.test', errorCode: 'test-naming', severity: 'error' },
  repository: { suffix: '.repository', errorCode: 'repository-naming', severity: 'error' },
}

export class GraphQLASTValidator {
  private errors: ValidationError[] = []
  private warnings: ValidationError[] = []
  private checkedFiles = 0
  private modules = new Set<string>()
  private program: ts.Program | null = null
  private resolverFields = new Map<string, Set<string>>() // className -> Set of field names

  constructor(
    private rootPath: string,
    private rules: ValidationRules,
  ) {}

  async validate(): Promise<ValidationResult> {
    this.errors = []
    this.warnings = []
    this.checkedFiles = 0
    this.modules.clear()
    this.resolverFields.clear()

    // Get gitignore patterns
    const gitignorePatterns = await this.getGitignorePatterns()

    // Combine default ignore patterns with gitignore patterns
    // Note: .test.ts files are included for naming validation but .spec.ts files are excluded
    const ignorePatterns = [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.spec.ts',
      ...gitignorePatterns,
    ]

    // Find all TypeScript files
    const files = await glob('**/*.ts', {
      cwd: this.rootPath,
      ignore: ignorePatterns,
    })

    // Filter files using ignore package for better gitignore support
    const ig = ignore()
    if (gitignorePatterns.length > 0) {
      ig.add(gitignorePatterns)
    }

    const filteredFiles = files.filter(file => !ig.ignores(file))
    const absoluteFiles = filteredFiles.map(f => path.join(this.rootPath, f))

    // Create TypeScript program for AST analysis
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      strict: false,
      noEmit: true,
    }

    this.program = ts.createProgram(absoluteFiles, compilerOptions)

    // Group files by module
    const moduleMap = this.groupFilesByModule(filteredFiles)

    // First pass: collect resolver field information
    for (const [moduleName, moduleFiles] of moduleMap.entries()) {
      const resolverFiles = moduleFiles.filter(f => f.endsWith('.resolver.ts'))
      await this.collectResolverFields(resolverFiles)
    }

    // Second pass: validate each module
    for (const [moduleName, moduleFiles] of moduleMap.entries()) {
      this.modules.add(moduleName)
      await this.validateModule(moduleName, moduleFiles)
    }

    // Enrich errors with snippets
    await this.enrichErrorsWithContext()

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      checkedFiles: this.checkedFiles,
      modules: Array.from(this.modules),
    }
  }

  private groupFilesByModule(files: string[]): Map<string, string[]> {
    const moduleMap = new Map<string, string[]>()

    for (const file of files) {
      const moduleName = this.extractModuleName(file)
      if (moduleName) {
        if (!moduleMap.has(moduleName)) {
          moduleMap.set(moduleName, [])
        }
        moduleMap.get(moduleName)!.push(file)
      }
    }

    return moduleMap
  }

  private extractModuleName(filePath: string): string | null {
    const parts = filePath.split('/')

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const nextPart = parts[i + 1]

      if (part === 'modules' || part === 'domains') {
        const potentialModule = parts[i + 1]
        if (potentialModule && !potentialModule.includes('.')) {
          return potentialModule
        }
      }

      if (part === 'src' && nextPart && nextPart !== 'modules' && nextPart !== 'domains') {
        if (!nextPart.includes('.')) {
          return nextPart
        }
      }

      if (nextPart && nextPart.includes('.')) {
        const [baseName] = nextPart.split('.')
        if (part === baseName) {
          return part
        }
      }
    }

    const fileName = path.basename(filePath)
    const match = fileName.match(
      /^([a-z-]+)\.(input|response|model|module|resolver|service|enum|util|test|repository)\.ts$/,
    )
    if (match) {
      return match[1]
    }

    return null
  }

  private async validateModule(moduleName: string, files: string[]) {
    const moduleFiles = {
      inputs: [] as string[],
      responses: [] as string[],
      models: [] as string[],
      entities: [] as string[],
      repositories: [] as string[],
      modules: [] as string[],
      resolvers: [] as string[],
      services: [] as string[],
      enums: [] as string[],
      utils: [] as string[],
      tests: [] as string[],
      other: [] as string[],
    }

    // Categorize files
    for (const file of files) {
      this.checkedFiles++
      const fileName = path.basename(file)

      if (fileName.endsWith('.input.ts')) {
        moduleFiles.inputs.push(file)
      } else if (fileName.endsWith('.response.ts')) {
        moduleFiles.responses.push(file)
      } else if (fileName.endsWith('.model.ts')) {
        moduleFiles.models.push(file)
      } else if (fileName.endsWith('.entity.ts')) {
        moduleFiles.entities.push(file)
      } else if (fileName.endsWith('.repository.ts')) {
        moduleFiles.repositories.push(file)
      } else if (fileName.endsWith('.module.ts')) {
        moduleFiles.modules.push(file)
      } else if (fileName.endsWith('.resolver.ts')) {
        moduleFiles.resolvers.push(file)
      } else if (fileName.endsWith('.service.ts')) {
        moduleFiles.services.push(file)
      } else if (fileName.endsWith('.enum.ts')) {
        moduleFiles.enums.push(file)
      } else if (fileName.endsWith('.util.ts')) {
        moduleFiles.utils.push(file)
      } else if (fileName.endsWith('.test.ts')) {
        moduleFiles.tests.push(file)
      } else {
        moduleFiles.other.push(file)
      }
    }

    // Run validation rules
    if (this.rules.checkModelFiles) {
      await this.validateModelFiles(moduleName, moduleFiles.models, files)
    }

    if (this.rules.checkEntityFiles) {
      await this.validateEntityFiles(moduleName, moduleFiles.entities, moduleFiles.models)
    }

    if (this.rules.checkInputFiles) {
      await this.validateInputFiles(moduleName, moduleFiles.inputs)
    }

    if (this.rules.checkResolverFiles) {
      await this.validateResolverFiles(moduleName, moduleFiles.resolvers)
    }

    if (this.rules.checkServiceFiles) {
      await this.validateServiceFiles(moduleName, moduleFiles.services)
    }

    if (this.rules.checkModuleNaming) {
      await this.validateModuleNaming(moduleName, moduleFiles.modules, files)
    }

    if (this.rules.checkResolverEndpoints) {
      await this.validateResolverEndpoints(moduleName, moduleFiles.resolvers, files)
    }

    if (this.rules.checkHgraphStorage) {
      await this.validateHgraphStorageChains(moduleName, files)
    }

    if (this.rules.checkTypeOrmModule) {
      await this.validateTypeOrmModuleUsage(moduleName, files)
    }

    if (this.rules.checkTypeOnlyImports) {
      await this.validateTypeOnlyImports(moduleName, files)
    }

    if (this.rules.checkUnderscorePropertyUsage) {
      await this.validateUnderscorePropertyUsage(moduleName, files)
    }

    // Individual file naming validations
    if (this.rules.checkModelFileNaming) {
      this.validateFileNaming(moduleName, 'model', moduleFiles.models)
    }
    if (this.rules.checkServiceFileNaming) {
      this.validateFileNaming(moduleName, 'service', moduleFiles.services)
    }
    if (this.rules.checkResolverFileNaming) {
      this.validateFileNaming(moduleName, 'resolver', moduleFiles.resolvers)
    }
    if (this.rules.checkInputFileNaming) {
      this.validateFileNaming(moduleName, 'input', moduleFiles.inputs)
    }
    if (this.rules.checkResponseFileNaming) {
      this.validateFileNaming(moduleName, 'response', moduleFiles.responses)
    }
    if (this.rules.checkModuleFileNaming) {
      this.validateFileNaming(moduleName, 'module', moduleFiles.modules)
    }
    if (this.rules.checkEnumFileNaming) {
      this.validateFileNaming(moduleName, 'enum', moduleFiles.enums)
    }
    if (this.rules.checkUtilFileNaming) {
      this.validateFileNaming(moduleName, 'util', moduleFiles.utils)
    }
    if (this.rules.checkTestFileNaming) {
      this.validateFileNaming(moduleName, 'test', moduleFiles.tests)
    }
    if (this.rules.checkRepositoryFileNaming) {
      this.validateFileNaming(moduleName, 'repository', moduleFiles.repositories)
    }

    // Class name validations
    if (this.rules.checkServiceClassName) {
      this.validateClassName(moduleFiles.services, 'service', 'Service', 'service-class-name')
    }
    if (this.rules.checkResolverClassName) {
      this.validateClassName(moduleFiles.resolvers, 'resolver', 'Resolver', 'resolver-class-name')
    }
    if (this.rules.checkRepositoryClassName) {
      this.validateClassName(
        moduleFiles.repositories,
        'repository',
        'Repository',
        'repository-class-name',
      )
    }
  }

  // Folders that are not NestJS modules and should be excluded from naming validation
  private static readonly UTILITY_FOLDERS = new Set([
    'lib',
    'util',
    'utils',
    'helpers',
    'helper',
    'common',
    'shared',
    'core',
    'config',
    'constants',
    'types',
    'interfaces',
    'decorators',
    'guards',
    'pipes',
    'filters',
    'interceptors',
    'middleware',
    'middlewares',
  ])

  /**
   * Check if a module name is a utility folder (not a NestJS module)
   */
  private isUtilityFolder(moduleName: string): boolean {
    return GraphQLASTValidator.UTILITY_FOLDERS.has(moduleName)
  }

  /**
   * Unified file naming validation for all file types.
   * Valid patterns: {moduleName}.{type}.ts or {moduleName}-*.{type}.ts
   * Examples for 'article' module:
   *   - article.model.ts ✓
   *   - article-rating.model.ts ✓
   *   - user-article-rating.model.ts ✗ (should be article-user-rating.model.ts)
   *
   * Note: Utility folders (lib, util, helpers, etc.) are excluded from naming validation
   */
  private validateFileNaming(
    moduleName: string,
    fileType: ValidatedFileType,
    files: string[],
  ): void {
    // Skip naming validation for utility folders (not NestJS modules)
    if (this.isUtilityFolder(moduleName)) return

    const config = FILE_TYPE_CONFIGS[fileType]

    for (const file of files) {
      const fileName = path.basename(file, '.ts')

      // Allow patterns like: moduleName.type or moduleName-*.type
      const isValidNaming =
        fileName === `${moduleName}${config.suffix}` || fileName.startsWith(`${moduleName}-`)

      // Skip 'app' module for module files (special case)
      if (fileType === 'module' && moduleName === 'app') continue

      if (!isValidNaming) {
        const message = `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} file should be named "${moduleName}${config.suffix}.ts" or "${moduleName}-*${config.suffix}.ts", found "${fileName}.ts"`

        if (config.severity === 'error') {
          this.addError(file, config.errorCode, message)
        } else {
          this.addWarning(file, config.errorCode, message)
        }
      }
    }
  }

  /**
   * Validate that class names match the file name convention.
   * Example: user.service.ts should contain class UserService
   *
   * @param files - Array of file paths to validate
   * @param fileTypeSuffix - The file type suffix (e.g., 'service', 'resolver', 'repository')
   * @param classSuffix - The expected class name suffix (e.g., 'Service', 'Resolver', 'Repository')
   * @param errorCode - The error code to use for validation errors
   */
  private validateClassName(
    files: string[],
    fileTypeSuffix: string,
    classSuffix: string,
    errorCode: string,
  ): void {
    if (!this.program) return

    for (const file of files) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      const fileName = path.basename(file)
      const expectedBaseName = fileNameToClassName(fileName, fileTypeSuffix)
      const expectedClassName = `${expectedBaseName}${classSuffix}`

      let foundMatchingClass = false
      let foundClasses: string[] = []

      this.visitNode(sourceFile, node => {
        if (ts.isClassDeclaration(node) && node.name) {
          const className = node.name.text
          foundClasses.push(className)

          if (className === expectedClassName) {
            foundMatchingClass = true
          }
        }
      })

      if (!foundMatchingClass && foundClasses.length > 0) {
        const line = this.getFirstClassLine(sourceFile)
        this.addError(
          file,
          errorCode,
          `Class should be named "${expectedClassName}" based on file name, found: ${foundClasses.join(', ')}`,
          line,
        )
      }
    }
  }

  /**
   * Get the line number of the first class declaration in a source file
   */
  private getFirstClassLine(sourceFile: ts.SourceFile): number | undefined {
    let line: number | undefined

    this.visitNode(sourceFile, node => {
      if (ts.isClassDeclaration(node) && !line) {
        line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
      }
    })

    return line
  }

  private async validateInputFiles(moduleName: string, inputFiles: string[]) {
    if (!this.program) return

    const unnecessaryValidators = new Set<string>([])

    for (const file of inputFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      this.visitNode(sourceFile, node => {
        if (ts.isClassDeclaration(node)) {
          const decorators = this.getDecorators(node)
          const hasInputTypeDecorator = decorators.some(
            d => this.getDecoratorName(d) === 'InputType',
          )

          if (hasInputTypeDecorator) {
            // Check each property for unnecessary validation decorators
            node.members.forEach(member => {
              if (ts.isPropertyDeclaration(member)) {
                const propertyDecorators = this.getDecorators(member)
                let propertyName = 'unknown'
                if (member.name && ts.isIdentifier(member.name)) {
                  propertyName = member.name.text
                }

                // Check if property has @Field decorator (GraphQL field)
                const hasFieldDecorator = propertyDecorators.some(
                  d => this.getDecoratorName(d) === 'Field',
                )

                if (hasFieldDecorator) {
                  // Check for unnecessary validation decorators
                  for (const decorator of propertyDecorators) {
                    const decoratorName = this.getDecoratorName(decorator)

                    if (unnecessaryValidators.has(decoratorName)) {
                      const line = this.getLineNumber(sourceFile, decorator.getStart(sourceFile))
                      this.addError(
                        file,
                        'unnecessary-validation',
                        `@${decoratorName} validation is unnecessary in GraphQL input types. Type validation is enforced by the GraphQL layer. Remove this decorator for property '${propertyName}'.`,
                        line,
                      )
                    }
                  }
                }
              }
            })
          }
        }
      })
    }
  }

  private async validateModelFiles(moduleName: string, modelFiles: string[], allFiles: string[]) {
    if (!this.program) return

    // Note: Model file naming is now handled by unified validateFileNaming method

    // Check all files for entities and models in wrong places
    for (const file of allFiles) {
      // Skip .response.ts files - they can have @ObjectType
      if (file.endsWith('.response.ts')) continue

      // Skip .input.ts files - they're for input types
      if (file.endsWith('.input.ts')) continue

      // Skip .model.ts files - they're the correct place
      if (file.endsWith('.model.ts')) continue

      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      // Check for @Entity, @ObjectType, @InputType decorators in wrong files
      this.visitNode(sourceFile, node => {
        if (ts.isClassDeclaration(node)) {
          const decorators = this.getDecorators(node)
          for (const decorator of decorators) {
            const decoratorName = this.getDecoratorName(decorator)

            if (decoratorName === 'Entity') {
              const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
              this.addError(
                file,
                'model-location',
                `TypeORM entities should be in .model.ts files, found in ${path.basename(file)}`,
                line,
              )
            }

            if (decoratorName === 'ObjectType' && !this.isResponseClass(node)) {
              const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
              this.addError(
                file,
                'model-location',
                `GraphQL object types (non-response) should be in .model.ts files, found in ${path.basename(
                  file,
                )}`,
                line,
              )
            }

            if (decoratorName === 'InputType') {
              const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
              this.addError(
                file,
                'input-location',
                `GraphQL input types should be in .input.ts files, found in ${path.basename(file)}`,
                line,
              )
            }
          }
        }
      })
    }

    // Check for response types in wrong files
    for (const file of allFiles) {
      // Skip .response.ts files - they're the correct place
      if (file.endsWith('.response.ts')) continue

      // Skip .model.ts files - they can have @ObjectType for entities
      if (file.endsWith('.model.ts')) continue

      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      this.visitNode(sourceFile, node => {
        if (ts.isClassDeclaration(node)) {
          const decorators = this.getDecorators(node)
          for (const decorator of decorators) {
            const decoratorName = this.getDecoratorName(decorator)

            // Check if this is a response class with @ObjectType
            if (decoratorName === 'ObjectType' && this.isResponseClass(node)) {
              const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
              this.addError(
                file,
                'response-location',
                `GraphQL response types should be in .response.ts files, found in ${path.basename(
                  file,
                )}`,
                line,
              )
            }
          }
        }
      })
    }
  }

  private async validateEntityFiles(
    moduleName: string,
    entityFiles: string[],
    modelFiles: string[],
  ) {
    if (!this.program) return

    // Entity files should not exist
    if (entityFiles.length > 0) {
      for (const file of entityFiles) {
        this.addError(
          file,
          'entity-file-not-allowed',
          'Entity files (.entity.ts) are not allowed. TypeORM entities should be in .model.ts files',
        )
      }
    }

    // Validate entity structure in model files
    for (const file of modelFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      this.visitNode(sourceFile, node => {
        if (ts.isClassDeclaration(node)) {
          const decorators = this.getDecorators(node)
          const hasEntityDecorator = decorators.some(d => this.getDecoratorName(d) === 'Entity')

          if (hasEntityDecorator) {
            // Check for missing column decorators on properties
            this.validateEntityProperties(node, file, sourceFile)
          }
        }
      })
    }
  }

  private validateEntityProperties(
    classNode: ts.ClassDeclaration,
    file: string,
    sourceFile: ts.SourceFile,
  ) {
    const columnDecorators = new Set([
      'Column',
      'PrimaryColumn',
      'PrimaryGeneratedColumn',
      'CreateDateColumn',
      'UpdateDateColumn',
      'DeleteDateColumn',
      'VersionColumn',
      'Generated',
    ])

    const relationDecorators = new Set([
      'ManyToOne',
      'OneToMany',
      'OneToOne',
      'ManyToMany',
      'JoinColumn',
      'JoinTable',
      'RelationId',
    ])

    // Get the class name to check resolver fields
    const className = classNode.name?.text

    classNode.members.forEach(member => {
      if (ts.isPropertyDeclaration(member)) {
        let propertyName: string | undefined
        if (member.name) {
          if (ts.isIdentifier(member.name)) {
            propertyName = member.name.text
          } else if (ts.isStringLiteral(member.name)) {
            propertyName = member.name.text
          }
        }

        // Skip special properties
        if (propertyName === 'constructor') return

        // Check if property has any decorator
        let hasColumnDecorator = false
        let hasRelationDecorator = false

        const decorators = this.getDecorators(member)
        for (const decorator of decorators) {
          const decoratorName = this.getDecoratorName(decorator)
          if (columnDecorators.has(decoratorName)) {
            hasColumnDecorator = true
            break
          }
          if (relationDecorators.has(decoratorName)) {
            hasRelationDecorator = true
            break
          }
        }

        // If it's a property without any persistence decorator
        if (!hasColumnDecorator && !hasRelationDecorator && propertyName) {
          // Check if this is a computed field with a resolver
          const isComputedField =
            className &&
            this.resolverFields.has(className) &&
            this.resolverFields.get(className)?.has(propertyName)

          // Only warn if it's not a computed field
          if (!isComputedField) {
            const line = this.getLineNumber(sourceFile, member.getStart(sourceFile))
            this.addWarning(
              file,
              'missing-column-decorator',
              `Property '${propertyName}' is missing @Column() or relation decorator. If you want to keep it GraphQL-only without persistence, move this to a @ResolveField() in the resolver.`,
              line,
            )
          }
        }
      }
    })
  }

  private async collectResolverFields(resolverFiles: string[]) {
    if (!this.program) return

    for (const file of resolverFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      this.visitNode(sourceFile, node => {
        if (ts.isClassDeclaration(node)) {
          const decorators = this.getDecorators(node)

          // Check if this is a resolver class
          const hasResolverDecorator = decorators.some(d => {
            const name = this.getDecoratorName(d)
            return name === 'Resolver'
          })

          if (hasResolverDecorator) {
            // Extract the entity class name from @Resolver(() => EntityClass)
            let entityClassName: string | undefined

            for (const decorator of decorators) {
              if (this.getDecoratorName(decorator) === 'Resolver') {
                const expression = decorator.expression
                if (ts.isCallExpression(expression) && expression.arguments.length > 0) {
                  const arg = expression.arguments[0]

                  // Handle arrow function: () => EntityClass
                  if (ts.isArrowFunction(arg) && ts.isIdentifier(arg.body)) {
                    entityClassName = arg.body.text
                  }
                  // Handle direct reference: EntityClass
                  else if (ts.isIdentifier(arg)) {
                    entityClassName = arg.text
                  }
                }
                break
              }
            }

            if (!entityClassName) {
              // If no entity specified, use the resolver class name minus "Resolver"
              const resolverClassName = node.name?.text || ''
              entityClassName = resolverClassName.replace(/Resolver$/, '')
            }

            // Collect field resolver methods
            const fields = new Set<string>()

            node.members.forEach(member => {
              if (ts.isMethodDeclaration(member)) {
                const methodDecorators = this.getDecorators(member)

                for (const decorator of methodDecorators) {
                  const decoratorName = this.getDecoratorName(decorator)

                  if (decoratorName === 'ResolveField' || decoratorName === 'FieldResolver') {
                    // Get the field name
                    let fieldName: string | undefined

                    // Try to get field name from decorator arguments
                    const expression = decorator.expression
                    if (ts.isCallExpression(expression) && expression.arguments.length > 0) {
                      const firstArg = expression.arguments[0]

                      // Handle @ResolveField('fieldName')
                      if (ts.isStringLiteral(firstArg)) {
                        fieldName = firstArg.text
                      }
                      // Handle @ResolveField(() => Type, { name: 'fieldName' })
                      else if (expression.arguments.length > 1) {
                        const optionsArg = expression.arguments[1]
                        if (ts.isObjectLiteralExpression(optionsArg)) {
                          for (const prop of optionsArg.properties) {
                            if (ts.isPropertyAssignment(prop)) {
                              const propName = prop.name
                              if (ts.isIdentifier(propName) && propName.text === 'name') {
                                if (ts.isStringLiteral(prop.initializer)) {
                                  fieldName = prop.initializer.text
                                }
                              }
                            }
                          }
                        }
                      }
                    }

                    // If no explicit field name, use method name
                    if (!fieldName && member.name && ts.isIdentifier(member.name)) {
                      fieldName = member.name.text
                    }

                    if (fieldName) {
                      fields.add(fieldName)
                    }
                  }
                }
              }
            })

            if (entityClassName && fields.size > 0) {
              this.resolverFields.set(entityClassName, fields)
            }
          }
        }
      })
    }
  }

  private async validateResolverFiles(moduleName: string, resolverFiles: string[]) {
    if (!this.program) return

    for (const file of resolverFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      let hasResolverDecorator = false
      let hasAnyOperation = false

      this.visitNode(sourceFile, node => {
        if (ts.isClassDeclaration(node)) {
          const decorators = this.getDecorators(node)
          if (decorators.some(d => this.getDecoratorName(d) === 'Resolver')) {
            hasResolverDecorator = true
          }
        }

        if (ts.isMethodDeclaration(node)) {
          const decorators = this.getDecorators(node)
          for (const decorator of decorators) {
            const decoratorName = this.getDecoratorName(decorator)
            if (
              ['Query', 'Mutation', 'Subscription', 'ResolveField', 'FieldResolver'].includes(
                decoratorName,
              )
            ) {
              hasAnyOperation = true
            }
          }
        }
      })

      if (!hasResolverDecorator) {
        this.addError(
          file,
          'resolver-class',
          'Resolver files should contain a class decorated with @Resolver()',
        )
      }

      if (hasResolverDecorator && !hasAnyOperation) {
        this.addWarning(
          file,
          'empty-resolver',
          'Resolver file does not contain any Query, Mutation, Subscription, or Field resolvers',
        )
      }
    }

    // Note: We don't warn about missing resolver files anymore
    // It's valid to have utility modules without resolvers, controllers, or services
  }

  private async validateServiceFiles(moduleName: string, serviceFiles: string[]) {
    if (!this.program) return

    for (const file of serviceFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      let hasServiceClass = false

      this.visitNode(sourceFile, node => {
        if (ts.isClassDeclaration(node)) {
          const className = node.name?.text || ''
          const decorators = this.getDecorators(node)
          const hasInjectableDecorator = decorators.some(
            d => this.getDecoratorName(d) === 'Injectable',
          )

          // Consider it a service if it has @Injectable or class name ends with Service
          if (hasInjectableDecorator || className.endsWith('Service')) {
            hasServiceClass = true
          }
        }
      })

      if (!hasServiceClass) {
        this.addError(
          file,
          'service-class',
          'Service files should contain a class decorated with @Injectable() or a class name ending with Service',
        )
      }
    }
  }

  private async validateModuleNaming(
    moduleName: string,
    moduleFiles: string[],
    allFiles: string[],
  ) {
    // Check if this module has any NestJS-related files that would require a .module.ts
    const hasNestJSFiles = allFiles.some(
      file =>
        file.endsWith('.resolver.ts') ||
        file.endsWith('.controller.ts') ||
        file.endsWith('.service.ts') ||
        file.endsWith('.model.ts'),
    )

    // Check if module file exists - only required if module has any NestJS files
    if (moduleFiles.length === 0 && hasNestJSFiles && moduleName !== 'app') {
      this.addWarning(
        moduleName,
        'missing-module',
        `Module "${moduleName}" is missing a .module.ts file`,
      )
    }

    // Note: Module file naming is now handled by unified validateFileNaming method
  }

  private async validateResolverEndpoints(
    moduleName: string,
    resolverFiles: string[],
    allFiles: string[],
  ) {
    if (!this.program) return

    const resolverDecorators = new Set([
      'Query',
      'Mutation',
      'Subscription',
      'ResolveField',
      'FieldResolver',
    ])

    // Check if GraphQL operations exist outside of resolver files
    for (const file of allFiles) {
      if (file.endsWith('.resolver.ts')) continue

      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      this.visitNode(sourceFile, node => {
        if (ts.isMethodDeclaration(node)) {
          const decorators = this.getDecorators(node)
          for (const decorator of decorators) {
            const decoratorName = this.getDecoratorName(decorator)

            if (resolverDecorators.has(decoratorName)) {
              const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
              this.addError(
                file,
                'resolver-location',
                'GraphQL operations (Query, Mutation, Subscription, Field resolvers) should only be in .resolver.ts files',
                line,
              )
            }
          }
        }
      })
    }

    // Validate resolver files for multiple @Args() decorators
    for (const file of resolverFiles) {
      await this.validateResolverArguments(file)
    }

    // Validate that event publishing is only in services
    await this.validateEventPublishing(resolverFiles, allFiles)
  }

  private async validateResolverArguments(file: string) {
    if (!this.program) return

    const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
    if (!sourceFile) return

    this.visitNode(sourceFile, node => {
      if (ts.isMethodDeclaration(node)) {
        // Check if this is a Query, Mutation, or Subscription
        const decorators = this.getDecorators(node)
        let isGraphQLEndpoint = false

        for (const decorator of decorators) {
          const decoratorName = this.getDecoratorName(decorator)
          if (['Query', 'Mutation', 'Subscription'].includes(decoratorName)) {
            isGraphQLEndpoint = true
            break
          }
        }

        if (isGraphQLEndpoint && node.parameters) {
          // Count @Args() decorators
          let argsCount = 0
          const argsParameters: Array<{ name: string; line: number }> = []

          for (const param of node.parameters) {
            const paramDecorators = this.getDecorators(param)
            for (const decorator of paramDecorators) {
              const decoratorName = this.getDecoratorName(decorator)
              if (decoratorName === 'Args') {
                argsCount++

                // Try to extract the argument name from @Args('argName')
                let argName = 'unknown'
                const expression = decorator.expression
                if (ts.isCallExpression(expression) && expression.arguments.length > 0) {
                  const firstArg = expression.arguments[0]
                  if (ts.isStringLiteral(firstArg)) {
                    argName = firstArg.text
                  }
                }

                // If no explicit name in decorator, use parameter name
                if (argName === 'unknown' && param.name && ts.isIdentifier(param.name)) {
                  argName = param.name.text
                }

                const line = this.getLineNumber(sourceFile, param.getStart(sourceFile))
                argsParameters.push({ name: argName, line })
              }
            }
          }

          // If there are more than 1 @Args() decorator, report an error
          if (argsCount > 1) {
            const methodName = node.name && ts.isIdentifier(node.name) ? node.name.text : 'unknown'
            // Use the first @Args parameter line for the snippet
            const line = argsParameters[0]?.line

            const paramList = argsParameters.map(p => `@Args('${p.name}')`).join(', ')

            this.addError(
              file,
              'multiple-args-decorators',
              `GraphQL endpoints should have maximum 1 @Args() decorator. Method '${methodName}' has ${argsCount} @Args() decorators (${paramList}). When there are multiple arguments, combine them into a single input type.`,
              line,
            )
          }
        }
      }
    })
  }

  private async validateEventPublishing(resolverFiles: string[], allFiles: string[]) {
    if (!this.program) return

    // Check resolvers for event publishing
    for (const file of resolverFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      this.visitNode(sourceFile, node => {
        // Check for method calls like emit(), publish(), dispatchEvent()
        if (ts.isCallExpression(node)) {
          const expression = node.expression

          // Check for patterns like: this.eventEmitter.emit(), eventEmitter.emit(), this.emit()
          if (ts.isPropertyAccessExpression(expression)) {
            const methodName = expression.name.text

            // Common event publishing methods
            if (['emit', 'publish', 'dispatchEvent', 'publishEvent'].includes(methodName)) {
              const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
              this.addError(
                file,
                'event-in-resolver',
                `Event publishing should only be done in service layer, not in resolvers. Move this.${methodName}() to a service method.`,
                line,
              )
            }
          }
        }
      })
    }
  }

  private async validateHgraphStorageChains(moduleName: string, allFiles: string[]) {
    if (!this.program) return

    for (const file of allFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      // Check if this file imports from @hgraph/storage
      const hasHgraphStorageImport = this.hasImportFrom(sourceFile, '@hgraph/storage')
      if (!hasHgraphStorageImport) continue

      // Visit all nodes to find query chains
      this.visitNode(sourceFile, node => {
        if (ts.isCallExpression(node)) {
          // Extract the method call chain
          const methodChain = this.extractMethodChain(node)

          // Check if whereIn exists in the chain
          const whereInIndex = methodChain.findIndex(method => method.name === 'whereIn')
          if (whereInIndex === -1) return // No whereIn in this chain

          // whereIn should be the last method (index 0 in our reversed chain)
          if (whereInIndex !== 0) {
            // whereIn is not the last method - this is an error
            const methodsAfterWhereIn = methodChain
              .slice(0, whereInIndex)
              .map(m => `.${m.name}()`)
              .join('')

            const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
            this.addError(
              file,
              'hgraph-storage-wherein',
              `.whereIn() must be the last method in the query chain. Found ${methodsAfterWhereIn} after .whereIn()`,
              line,
            )
          }
        }
      })
    }
  }

  private async validateTypeOrmModuleUsage(moduleName: string, allFiles: string[]) {
    if (!this.program) return

    for (const file of allFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      // Check for TypeOrmModule and InjectRepository imports from @nestjs/typeorm
      this.visitNode(sourceFile, node => {
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier
          if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === '@nestjs/typeorm') {
            // Check if TypeOrmModule or InjectRepository is being imported
            const importClause = node.importClause
            if (importClause && importClause.namedBindings) {
              if (ts.isNamedImports(importClause.namedBindings)) {
                for (const element of importClause.namedBindings.elements) {
                  const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))

                  if (element.name.text === 'TypeOrmModule') {
                    this.addError(
                      file,
                      'typeorm-module-usage',
                      'Never use TypeOrmModule directly. Use @hgraph/storage module instead. Import StorageModule from @hgraph/storage/nestjs',
                      line,
                    )
                  }

                  if (element.name.text === 'InjectRepository') {
                    this.addError(
                      file,
                      'inject-repository-usage',
                      'Never use @InjectRepository decorator directly. Use @InjectRepo from @hgraph/storage/nestjs instead',
                      line,
                    )
                  }
                }
              }
            }
          }
        }
      })
    }
  }

  private async validateTypeOnlyImports(moduleName: string, allFiles: string[]) {
    if (!this.program) return

    for (const file of allFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      // Track type-only imports
      const typeOnlyImports = new Map<string, { line: number; source: string }>()

      // First pass: collect type-only imports
      this.visitNode(sourceFile, node => {
        if (ts.isImportDeclaration(node)) {
          const importClause = node.importClause
          const moduleSpecifier = node.moduleSpecifier

          // Check for type-only imports: import type { X } from '...'
          if (importClause && importClause.isTypeOnly && ts.isStringLiteral(moduleSpecifier)) {
            if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
              for (const element of importClause.namedBindings.elements) {
                const importedName = element.name.text
                const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
                typeOnlyImports.set(importedName, {
                  line,
                  source: moduleSpecifier.text,
                })
              }
            }
          }

          // Check for individual type-only imports: import { type X } from '...'
          if (
            importClause &&
            !importClause.isTypeOnly &&
            importClause.namedBindings &&
            ts.isNamedImports(importClause.namedBindings) &&
            ts.isStringLiteral(moduleSpecifier)
          ) {
            for (const element of importClause.namedBindings.elements) {
              if (element.isTypeOnly) {
                const importedName = element.name.text
                const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
                typeOnlyImports.set(importedName, {
                  line,
                  source: moduleSpecifier.text,
                })
              }
            }
          }
        }
      })

      // Second pass: check if type-only imports are used in decorators
      if (typeOnlyImports.size > 0) {
        this.visitNode(sourceFile, node => {
          // Check decorator arguments
          if (ts.isDecorator(node)) {
            const expression = node.expression

            // Handle both @Decorator and @Decorator(args)
            let decoratorName = ''
            let callExpression: ts.CallExpression | undefined

            if (ts.isCallExpression(expression)) {
              callExpression = expression
              if (ts.isIdentifier(expression.expression)) {
                decoratorName = expression.expression.text
              }
            } else if (ts.isIdentifier(expression)) {
              decoratorName = expression.text
            }

            // Check if this is a decorator that needs runtime values
            const runtimeDecorators = ['InjectRepo', 'InjectRepository', 'InjectModel']

            if (runtimeDecorators.includes(decoratorName) && callExpression) {
              // Check all arguments for type-only imports
              for (const arg of callExpression.arguments) {
                if (ts.isIdentifier(arg)) {
                  const argName = arg.text
                  if (typeOnlyImports.has(argName)) {
                    const importInfo = typeOnlyImports.get(argName)!
                    const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
                    this.addError(
                      file,
                      'type-only-import-in-decorator',
                      `Cannot use type-only import '${argName}' in decorator @${decoratorName}(). Remove 'type' keyword from import statement at line ${importInfo.line}. Decorators need runtime values, not just types.`,
                      line,
                    )
                  }
                }
              }
            }
          }
        })
      }
    }
  }

  private async validateUnderscorePropertyUsage(moduleName: string, allFiles: string[]) {
    if (!this.program) return

    for (const file of allFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      this.visitNode(sourceFile, node => {
        if (ts.isClassDeclaration(node)) {
          // Collect all properties that start with underscore
          const underscoreProperties = new Map<
            string,
            { line: number; nameWithoutUnderscore: string }
          >()

          // First pass: collect underscore-prefixed properties from class members
          node.members.forEach(member => {
            if (ts.isPropertyDeclaration(member)) {
              if (member.name && ts.isIdentifier(member.name)) {
                const propName = member.name.text
                if (propName.startsWith('_')) {
                  const nameWithoutUnderscore = propName.slice(1)
                  const line = this.getLineNumber(sourceFile, member.getStart(sourceFile))
                  underscoreProperties.set(propName, { line, nameWithoutUnderscore })
                }
              }
            }
          })

          // Also check constructor parameters (which become class properties)
          node.members.forEach(member => {
            if (ts.isConstructorDeclaration(member)) {
              member.parameters.forEach(param => {
                if (param.name && ts.isIdentifier(param.name)) {
                  const propName = param.name.text
                  if (propName.startsWith('_')) {
                    const nameWithoutUnderscore = propName.slice(1)
                    const line = this.getLineNumber(sourceFile, param.getStart(sourceFile))
                    underscoreProperties.set(propName, { line, nameWithoutUnderscore })
                  }
                }
              })
            }
          })

          if (underscoreProperties.size === 0) return

          // Second pass: check if the underscore version is used anywhere in the class
          const usedUnderscoreProperties = new Set<string>()

          this.visitNode(node, innerNode => {
            // Check property access like this._messageRepository
            if (ts.isPropertyAccessExpression(innerNode)) {
              if (innerNode.expression.kind === ts.SyntaxKind.ThisKeyword) {
                const accessedProp = innerNode.name.text
                if (accessedProp.startsWith('_')) {
                  usedUnderscoreProperties.add(accessedProp)
                }
              }
            }
          })

          // Report errors where underscore property is defined AND used with underscore
          for (const [propName, info] of underscoreProperties) {
            if (usedUnderscoreProperties.has(propName)) {
              this.addError(
                file,
                'underscore-property-usage',
                `Property '${propName}' should not use underscore prefix if it's being used. Rename to '${info.nameWithoutUnderscore}'.`,
                info.line,
              )
            }
          }
        }
      })
    }
  }

  /**
   * Check if a source file has an import from a specific module
   */
  private hasImportFrom(sourceFile: ts.SourceFile, moduleName: string): boolean {
    let hasImport = false

    this.visitNode(sourceFile, node => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier
        if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text.startsWith(moduleName)) {
          hasImport = true
        }
      }
    })

    return hasImport
  }

  /**
   * Extract method call chain from a CallExpression
   * Returns array of methods in reverse order (last call first)
   * Example: q.whereEqualTo().whereIn() -> ['whereIn', 'whereEqualTo']
   */
  private extractMethodChain(node: ts.CallExpression): Array<{ name: string; node: ts.Node }> {
    const chain: Array<{ name: string; node: ts.Node }> = []
    let current: ts.Node = node

    while (ts.isCallExpression(current)) {
      const expression = current.expression

      if (ts.isPropertyAccessExpression(expression)) {
        const methodName = expression.name.text
        chain.push({ name: methodName, node: current })
        current = expression.expression
      } else {
        break
      }
    }

    return chain
  }

  // Helper methods for AST traversal
  private visitNode(node: ts.Node, callback: (node: ts.Node) => void) {
    callback(node)
    node.forEachChild(child => this.visitNode(child, callback))
  }

  private getDecorators(node: ts.HasDecorators): readonly ts.Decorator[] {
    // In TypeScript 5.x, use getDecorators from ts.getDecorators or modifiers
    if (ts.canHaveDecorators(node)) {
      const decorators = ts.getDecorators(node)
      return decorators || []
    }
    return []
  }

  private getDecoratorName(decorator: ts.Decorator): string {
    const expression = decorator.expression

    if (ts.isCallExpression(expression)) {
      const expr = expression.expression
      if (ts.isIdentifier(expr)) {
        return expr.text
      }
    } else if (ts.isIdentifier(expression)) {
      return expression.text
    }

    return ''
  }

  private isResponseClass(classNode: ts.ClassDeclaration): boolean {
    if (!classNode.name || !ts.isIdentifier(classNode.name)) return false
    const className = classNode.name.text
    return className.includes('Response')
  }

  private getLineNumber(sourceFile: ts.SourceFile, pos: number): number {
    const { line } = sourceFile.getLineAndCharacterOfPosition(pos)
    return line + 1 // Convert to 1-based line numbers
  }

  private async getGitignorePatterns(): Promise<string[]> {
    const gitignorePath = path.join(this.rootPath, '.gitignore')
    try {
      const gitignoreContent = await fs.promises.readFile(gitignorePath, 'utf-8')
      return gitignoreContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim())
    } catch (error) {
      return []
    }
  }

  private async enrichErrorsWithContext(): Promise<void> {
    // Process errors
    for (const error of this.errors) {
      if (!error.snippet && error.line) {
        const content = await this.readFile(error.file)
        error.snippet = this.extractSnippet(content, error.line)
      }
    }

    // Process warnings
    for (const warning of this.warnings) {
      if (!warning.snippet && warning.line) {
        const content = await this.readFile(warning.file)
        warning.snippet = this.extractSnippet(content, warning.line)
      }
    }
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.rootPath, filePath)
      return await fs.promises.readFile(fullPath, 'utf-8')
    } catch (error) {
      return ''
    }
  }

  private extractSnippet(content: string, lineNumber: number): string | undefined {
    if (!lineNumber) return undefined

    const lines = content.split('\n')
    const startLine = Math.max(0, lineNumber - 2)
    const endLine = Math.min(lines.length, lineNumber + 1)

    const maxLineNum = endLine
    const lineNumWidth = maxLineNum.toString().length

    const snippet: string[] = []
    for (let i = startLine; i < endLine; i++) {
      const lineNum = i + 1
      const indicator = lineNum === lineNumber ? '>' : ' '
      snippet.push(`${indicator} ${lineNum.toString().padStart(lineNumWidth, ' ')} | ${lines[i]}`)
    }

    return snippet.join('\n')
  }

  private addError(file: string, rule: string, message: string, line?: number) {
    this.errors.push({
      file,
      line,
      rule,
      message,
      severity: 'error',
    })
  }

  private addWarning(file: string, rule: string, message: string, line?: number) {
    this.warnings.push({
      file,
      line,
      rule,
      message,
      severity: 'warning',
    })
  }
}
