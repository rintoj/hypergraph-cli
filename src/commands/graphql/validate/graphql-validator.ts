import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

export interface ValidationError {
  file: string
  line?: number
  rule: string
  message: string
  severity: 'error' | 'warning'
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
}

export class GraphQLValidator {
  private errors: ValidationError[] = []
  private warnings: ValidationError[] = []
  private checkedFiles = 0
  private modules = new Set<string>()

  constructor(private rootPath: string, private rules: ValidationRules) {}

  async validate(): Promise<ValidationResult> {
    this.errors = []
    this.warnings = []
    this.checkedFiles = 0
    this.modules.clear()

    // Find all GraphQL-related TypeScript files
    const files = await glob('**/*.ts', {
      cwd: this.rootPath,
      ignore: ['node_modules/**', 'dist/**', 'build/**', '*.spec.ts', '*.test.ts'],
    })

    // Group files by module
    const moduleMap = this.groupFilesByModule(files)

    // Validate each module
    for (const [moduleName, moduleFiles] of moduleMap.entries()) {
      this.modules.add(moduleName)
      await this.validateModule(moduleName, moduleFiles)
    }

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
    // Extract module name from path patterns like:
    // src/modules/user/user.service.ts -> user
    // src/user/user.resolver.ts -> user
    // modules/product/product.input.ts -> product

    const parts = filePath.split('/')

    // Look for common module patterns
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const nextPart = parts[i + 1]

      // Check if this looks like a module directory
      if (part === 'modules' || part === 'src') {
        const potentialModule = parts[i + 1]
        if (potentialModule && !potentialModule.includes('.')) {
          return potentialModule
        }
      }

      // Check if the filename suggests a module
      if (nextPart && nextPart.includes('.')) {
        const [baseName] = nextPart.split('.')
        if (part === baseName) {
          return part
        }
      }
    }

    // Try to extract from filename if it follows pattern like user.service.ts
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
    if (this.rules.checkInputFiles) {
      await this.validateInputFiles(moduleName, moduleFiles.inputs, files)
    }

    if (this.rules.checkResponseFiles) {
      await this.validateResponseFiles(moduleName, moduleFiles.responses, files)
    }

    if (this.rules.checkModelFiles) {
      await this.validateModelFiles(moduleName, moduleFiles.models, files)
    }

    if (this.rules.checkModuleNaming) {
      await this.validateModuleNaming(moduleName, moduleFiles.modules)
    }

    if (this.rules.checkResolverFiles) {
      await this.validateResolverFiles(moduleName, moduleFiles.resolvers)
    }

    if (this.rules.checkServiceFiles) {
      await this.validateServiceFiles(moduleName, moduleFiles.services)
    }

    if (this.rules.checkResolverEndpoints) {
      await this.validateResolverEndpoints(moduleName, moduleFiles.resolvers)
    }
  }

  private async validateInputFiles(moduleName: string, inputFiles: string[], allFiles: string[]) {
    // Check if there are any GraphQL input types defined elsewhere
    for (const file of allFiles) {
      if (!file.endsWith('.input.ts')) {
        const content = await this.readFile(file)
        if (this.containsGraphQLInput(content)) {
          this.addError(
            file,
            'input-location',
            `GraphQL input types should be in .input.ts files, found in ${path.basename(file)}`
          )
        }
      }
    }
  }

  private async validateResponseFiles(moduleName: string, responseFiles: string[], allFiles: string[]) {
    // Check if there are any GraphQL response types defined elsewhere
    for (const file of allFiles) {
      if (!file.endsWith('.response.ts')) {
        const content = await this.readFile(file)
        if (this.containsGraphQLResponse(content)) {
          this.addError(
            file,
            'response-location',
            `GraphQL response types should be in .response.ts files, found in ${path.basename(file)}`
          )
        }
      }
    }
  }

  private async validateModelFiles(moduleName: string, modelFiles: string[], allFiles: string[]) {
    // Check if there are any TypeORM entities or GraphQL object types defined elsewhere
    for (const file of allFiles) {
      if (!file.endsWith('.model.ts')) {
        const content = await this.readFile(file)
        if (this.containsModel(content)) {
          this.addError(
            file,
            'model-location',
            `TypeORM entities and GraphQL object types should be in .model.ts files, found in ${path.basename(file)}`
          )
        }
      }
    }
  }

  private async validateModuleNaming(moduleName: string, moduleFiles: string[]) {
    if (moduleFiles.length === 0) {
      this.addWarning(
        moduleName,
        'missing-module',
        `Module ${moduleName} is missing a .module.ts file`
      )
      return
    }

    for (const file of moduleFiles) {
      const expectedName = `${moduleName}.module.ts`
      const fileName = path.basename(file)

      if (fileName !== expectedName) {
        this.addError(
          file,
          'module-naming',
          `Module file should be named ${expectedName}, found ${fileName}`
        )
      }

      // Check if the module file is in the correct directory
      const expectedPath = `${moduleName}/${expectedName}`
      if (!file.endsWith(expectedPath)) {
        this.addWarning(
          file,
          'module-path',
          `Module file should be at path ending with ${expectedPath}`
        )
      }
    }
  }

  private async validateResolverFiles(moduleName: string, resolverFiles: string[]) {
    if (resolverFiles.length === 0) {
      this.addWarning(
        moduleName,
        'missing-resolver',
        `Module ${moduleName} is missing resolver files`
      )
    }

    for (const file of resolverFiles) {
      const content = await this.readFile(file)

      // Check if resolver class exists
      if (!this.containsResolverClass(content)) {
        this.addError(
          file,
          'resolver-class',
          'Resolver file should contain a class decorated with @Resolver()'
        )
      }
    }
  }

  private async validateServiceFiles(moduleName: string, serviceFiles: string[]) {
    for (const file of serviceFiles) {
      const content = await this.readFile(file)

      // Check if service class exists
      if (!this.containsServiceClass(content)) {
        this.addError(
          file,
          'service-class',
          'Service file should contain a class decorated with @Injectable() or similar'
        )
      }
    }
  }

  private async validateResolverEndpoints(moduleName: string, resolverFiles: string[]) {
    for (const file of resolverFiles) {
      const content = await this.readFile(file)

      // Check if all GraphQL operations are in resolver files
      const hasQuery = this.containsQuery(content)
      const hasMutation = this.containsMutation(content)
      const hasSubscription = this.containsSubscription(content)
      const hasFieldResolver = this.containsFieldResolver(content)

      if (!hasQuery && !hasMutation && !hasSubscription && !hasFieldResolver) {
        this.addWarning(
          file,
          'empty-resolver',
          'Resolver file does not contain any Query, Mutation, Subscription, or Field resolvers'
        )
      }
    }

    // Check if GraphQL operations exist outside of resolver files
    const nonResolverFiles = await glob('**/*.ts', {
      cwd: this.rootPath,
      ignore: ['node_modules/**', 'dist/**', 'build/**', '*.spec.ts', '*.test.ts', '**/*.resolver.ts'],
    })

    for (const file of nonResolverFiles) {
      const content = await this.readFile(file)

      if (this.containsQuery(content) || this.containsMutation(content) ||
          this.containsSubscription(content) || this.containsFieldResolver(content)) {
        this.addError(
          file,
          'resolver-location',
          'GraphQL operations (Query, Mutation, Subscription, Field resolvers) should only be in .resolver.ts files'
        )
      }
    }
  }

  // Helper methods for content analysis
  private async readFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.rootPath, filePath)
      return await fs.promises.readFile(fullPath, 'utf-8')
    } catch (error) {
      return ''
    }
  }

  private containsGraphQLInput(content: string): boolean {
    // Check for @InputType decorator or InputType imports
    return /@InputType\(/.test(content) || /class\s+\w+Input\s*{/.test(content)
  }

  private containsGraphQLResponse(content: string): boolean {
    // Check for response-related patterns
    return /class\s+\w+Response\s*{/.test(content) || /@ObjectType\(.*Response/.test(content)
  }

  private containsModel(content: string): boolean {
    // Check for @Entity decorator (TypeORM) or @ObjectType (GraphQL)
    return /@Entity\(/.test(content) || (/@ObjectType\(/.test(content) && !this.containsGraphQLResponse(content))
  }

  private containsResolverClass(content: string): boolean {
    return /@Resolver\(/.test(content)
  }

  private containsServiceClass(content: string): boolean {
    return /@Injectable\(/.test(content) || /class\s+\w+Service\s*{/.test(content)
  }

  private containsQuery(content: string): boolean {
    return /@Query\(/.test(content)
  }

  private containsMutation(content: string): boolean {
    return /@Mutation\(/.test(content)
  }

  private containsSubscription(content: string): boolean {
    return /@Subscription\(/.test(content)
  }

  private containsFieldResolver(content: string): boolean {
    return /@ResolveField\(/.test(content) || /@FieldResolver\(/.test(content)
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