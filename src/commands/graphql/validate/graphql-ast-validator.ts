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
}

export class GraphQLASTValidator {
  private errors: ValidationError[] = []
  private warnings: ValidationError[] = []
  private checkedFiles = 0
  private modules = new Set<string>()
  private program: ts.Program | null = null
  private resolverFields = new Map<string, Set<string>>() // className -> Set of field names

  constructor(private rootPath: string, private rules: ValidationRules) {}

  async validate(): Promise<ValidationResult> {
    this.errors = []
    this.warnings = []
    this.checkedFiles = 0
    this.modules.clear()
    this.resolverFields.clear()

    // Get gitignore patterns
    const gitignorePatterns = await this.getGitignorePatterns()

    // Combine default ignore patterns with gitignore patterns
    const ignorePatterns = [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      ...gitignorePatterns
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
    const match = fileName.match(/^([a-z-]+)\.(input|response|model|module|resolver|service)\.ts$/)
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

    if (this.rules.checkResolverEndpoints) {
      await this.validateResolverEndpoints(moduleName, moduleFiles.resolvers, files)
    }
  }

  private async validateModelFiles(moduleName: string, modelFiles: string[], allFiles: string[]) {
    if (!this.program) return

    // Check all files for entities and models in wrong places
    for (const file of allFiles) {
      // Skip .response.ts files - they can have @ObjectType
      if (file.endsWith('.response.ts')) continue

      // Skip .model.ts files - they're the correct place
      if (file.endsWith('.model.ts')) continue

      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      // Check for @Entity or @ObjectType decorators in wrong files
      this.visitNode(sourceFile, (node) => {
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
                line
              )
            }

            if (decoratorName === 'ObjectType' && !this.isResponseClass(node)) {
              const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
              this.addError(
                file,
                'model-location',
                `GraphQL object types (non-response) should be in .model.ts files, found in ${path.basename(file)}`,
                line
              )
            }
          }
        }
      })
    }
  }

  private async validateEntityFiles(moduleName: string, entityFiles: string[], modelFiles: string[]) {
    if (!this.program) return

    // Entity files should not exist
    if (entityFiles.length > 0) {
      for (const file of entityFiles) {
        this.addError(
          file,
          'entity-file-not-allowed',
          'Entity files (.entity.ts) are not allowed. TypeORM entities should be in .model.ts files'
        )
      }
    }

    // Validate entity structure in model files
    for (const file of modelFiles) {
      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      this.visitNode(sourceFile, (node) => {
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

  private validateEntityProperties(classNode: ts.ClassDeclaration, file: string, sourceFile: ts.SourceFile) {
    const columnDecorators = new Set([
      'Column', 'PrimaryColumn', 'PrimaryGeneratedColumn',
      'CreateDateColumn', 'UpdateDateColumn', 'DeleteDateColumn',
      'VersionColumn', 'Generated'
    ])

    const relationDecorators = new Set([
      'ManyToOne', 'OneToMany', 'OneToOne', 'ManyToMany',
      'JoinColumn', 'JoinTable', 'RelationId'
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
          const isComputedField = className &&
            this.resolverFields.has(className) &&
            this.resolverFields.get(className)?.has(propertyName)

          // Only warn if it's not a computed field
          if (!isComputedField) {
            const line = this.getLineNumber(sourceFile, member.getStart(sourceFile))
            this.addWarning(
              file,
              'missing-column-decorator',
              'Entity properties should have @Column() or relation decorator for persistence (or be computed via resolver)',
              line
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

      this.visitNode(sourceFile, (node) => {
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

  private async validateResolverEndpoints(moduleName: string, resolverFiles: string[], allFiles: string[]) {
    if (!this.program) return

    const resolverDecorators = new Set(['Query', 'Mutation', 'Subscription', 'ResolveField', 'FieldResolver'])

    // Check if GraphQL operations exist outside of resolver files
    for (const file of allFiles) {
      if (file.endsWith('.resolver.ts')) continue

      const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
      if (!sourceFile) continue

      this.visitNode(sourceFile, (node) => {
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
                line
              )
            }
          }
        }
      })
    }
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