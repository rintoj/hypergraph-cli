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
  checkHgraphStorage: boolean
  checkEntityFiles: boolean
  checkRepositoryFiles: boolean
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
    // src/domains/product/product.module.ts -> product

    const parts = filePath.split('/')

    // Look for common module patterns
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const nextPart = parts[i + 1]

      // Check if this looks like a modules/domains container directory
      if (part === 'modules' || part === 'domains') {
        const potentialModule = parts[i + 1]
        if (potentialModule && !potentialModule.includes('.')) {
          return potentialModule
        }
      }

      // Check if we're in src and the next part is a module (not modules/domains)
      if (part === 'src' && nextPart && nextPart !== 'modules' && nextPart !== 'domains') {
        if (!nextPart.includes('.')) {
          return nextPart
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

    if (this.rules.checkEntityFiles) {
      await this.validateEntityFiles(moduleName, moduleFiles.entities, moduleFiles.models, files)
    }

    if (this.rules.checkRepositoryFiles) {
      await this.validateRepositoryFiles(moduleName, moduleFiles.repositories, files)
    }

    if (this.rules.checkHgraphStorage) {
      await this.validateHgraphStoragePatterns(
        moduleName,
        moduleFiles.entities,
        moduleFiles.repositories,
        moduleFiles.services,
        moduleFiles.modules,
        files
      )
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
    // Check if using @hgraph/storage - if so, entities can be in .entity.ts files
    const usesHgraphStorage = await this.detectHgraphStorageUsage(allFiles)

    // Check if there are any TypeORM entities or GraphQL object types defined elsewhere
    for (const file of allFiles) {
      // When using @hgraph/storage, .entity.ts files are allowed for entities
      const allowedFiles = usesHgraphStorage
        ? ['.model.ts', '.entity.ts']
        : ['.model.ts']

      const isAllowedFile = allowedFiles.some(ext => file.endsWith(ext))

      if (!isAllowedFile) {
        const content = await this.readFile(file)

        // For @hgraph/storage, only check for GraphQL @ObjectType in non-entity files
        // Entities are handled by validateEntityFiles
        if (usesHgraphStorage) {
          // Only check for @ObjectType that's not a response type
          if (this.containsObjectTypeModel(content) && !this.containsGraphQLResponse(content)) {
            this.addError(
              file,
              'model-location',
              `GraphQL object types should be in .model.ts or .entity.ts files, found in ${path.basename(file)}`
            )
          }
        } else {
          // Standard validation when not using @hgraph/storage
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
  }

  private async validateModuleNaming(moduleName: string, moduleFiles: string[]) {
    // Special case: app.module.ts is allowed at src/app.module.ts
    if (moduleName === 'app') {
      // app module doesn't need to follow the standard module structure
      return
    }

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
    // Skip resolver validation for app module as it typically doesn't have resolvers
    if (moduleName === 'app') {
      return
    }

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

  private async validateEntityFiles(
    moduleName: string,
    entityFiles: string[],
    modelFiles: string[],
    allFiles: string[]
  ) {
    // Check if using @hgraph/storage patterns
    const usesHgraphStorage = await this.detectHgraphStorageUsage(allFiles)

    if (usesHgraphStorage) {
      // When using @hgraph/storage, entities should be in .model.ts files
      if (entityFiles.length > 0 && modelFiles.length === 0) {
        for (const file of entityFiles) {
          this.addWarning(
            file,
            'entity-naming',
            'When using @hgraph/storage, consider using .model.ts instead of .entity.ts for TypeORM entities'
          )
        }
      }

      // Check for @Entity decorator in wrong files
      for (const file of allFiles) {
        if (!file.endsWith('.entity.ts') && !file.endsWith('.model.ts')) {
          const content = await this.readFile(file)
          if (this.containsEntityDecorator(content)) {
            this.addError(
              file,
              'entity-location',
              'TypeORM @Entity decorators should be in .model.ts or .entity.ts files when using @hgraph/storage'
            )
          }
        }
      }

      // Validate entity structure
      for (const file of entityFiles) {
        const content = await this.readFile(file)

        // Check for @Entity decorator
        if (!this.containsEntityDecorator(content)) {
          this.addError(
            file,
            'missing-entity-decorator',
            'Entity file must have @Entity() decorator'
          )
        }

        // Check for @PrimaryColumn or @PrimaryGeneratedColumn
        if (!this.containsPrimaryColumn(content)) {
          this.addError(
            file,
            'missing-primary-column',
            'Entity must have @PrimaryColumn() or @PrimaryGeneratedColumn() decorator'
          )
        }

        // Check for proper Column decorators
        if (this.containsPropertyWithoutDecorator(content)) {
          this.addWarning(
            file,
            'missing-column-decorator',
            'Entity properties should have @Column() decorator for persistence'
          )
        }

        // Check nullable configuration
        if (this.hasOptionalWithoutNullable(content)) {
          this.addWarning(
            file,
            'nullable-configuration',
            'Optional properties should have @Column({ nullable: true }) configuration'
          )
        }
      }
    }
  }

  private async validateRepositoryFiles(
    moduleName: string,
    repositoryFiles: string[],
    allFiles: string[]
  ) {
    const usesHgraphStorage = await this.detectHgraphStorageUsage(allFiles)

    if (!usesHgraphStorage) {
      return
    }

    // Check for repository patterns in wrong files
    for (const file of allFiles) {
      if (!file.endsWith('.repository.ts')) {
        const content = await this.readFile(file)
        if (this.extendsRepository(content)) {
          this.addError(
            file,
            'repository-location',
            'Repository classes should be in .repository.ts files'
          )
        }
      }
    }

    // Validate repository structure
    for (const file of repositoryFiles) {
      const content = await this.readFile(file)

      // Check if extends Repository
      if (!this.extendsRepository(content)) {
        this.addError(
          file,
          'repository-inheritance',
          'Repository class should extend Repository<T>, RepositoryWithIdCache<T>, or FirestoreRepository<T> from @hgraph/storage'
        )
      }

      // Check for constructor
      if (!this.hasProperRepositoryConstructor(content)) {
        this.addWarning(
          file,
          'repository-constructor',
          'Repository should have constructor calling super() with entity class'
        )
      }

      // Check for business logic in repository
      if (this.containsBusinessLogic(content)) {
        this.addWarning(
          file,
          'repository-logic',
          'Business logic should be in service files, not repositories. Repositories should only handle data access'
        )
      }

      // Check for caching decorators
      if (this.shouldUseCaching(content) && !this.hasCachingDecorator(content)) {
        this.addWarning(
          file,
          'repository-caching',
          'Consider using RepositoryWithIdCache or @WithCache decorator for GraphQL applications'
        )
      }
    }
  }

  private async validateHgraphStoragePatterns(
    moduleName: string,
    entityFiles: string[],
    repositoryFiles: string[],
    serviceFiles: string[],
    moduleFiles: string[],
    allFiles: string[]
  ) {
    const usesHgraphStorage = await this.detectHgraphStorageUsage(allFiles)

    if (!usesHgraphStorage) {
      return
    }

    // Check module configuration
    for (const file of moduleFiles) {
      const content = await this.readFile(file)

      // Check for StorageModule.forRoot - can be in any module, not just app.module
      if (this.hasStorageModuleForRoot(content)) {
        // Only check for hardcoded credentials
        // StorageModule.forRoot() configuration is valid as long as it's called with any config object
        // Check for hardcoded credentials
        if (this.hasHardcodedCredentials(content)) {
          this.addError(
            file,
            'hardcoded-credentials',
            'Database credentials should use environment variables, not hardcoded values'
          )
        }
      }

      // Special check for app.module.ts - should have forRoot when using @hgraph/storage
      if (file.includes('app.module') && !this.hasStorageModuleForRoot(content)) {
        // Only warn if this is truly the root app module and entities exist in the project
        const hasEntitiesInProject = entityFiles.length > 0 ||
                                     (await this.hasAnyEntitiesInProject(allFiles))

        if (hasEntitiesInProject) {
          this.addWarning(
            file,
            'storage-module-root',
            'App module should import StorageModule.forRoot() when using @hgraph/storage with entities'
          )
        }
      }

      // Check for StorageModule.forFeature in feature modules
      if (!file.includes('app.module') && entityFiles.length > 0) {
        if (!this.hasStorageModuleForFeature(content)) {
          this.addWarning(
            file,
            'storage-module-feature',
            `Module should import StorageModule.forFeature([...entities]) when using @hgraph/storage`
          )
        }
      }
    }

    // Check service dependency injection
    for (const file of serviceFiles) {
      const content = await this.readFile(file)

      // Check for @InjectRepo usage
      if (this.usesRepository(content) && !this.hasInjectRepoDecorator(content)) {
        this.addError(
          file,
          'missing-inject-repo',
          'Use @InjectRepo(Entity) decorator to inject repositories in NestJS services'
        )
      }

      // Check for proper repository typing
      if (this.hasInjectRepoDecorator(content)) {
        if (!this.hasProperRepositoryTyping(content)) {
          this.addWarning(
            file,
            'repository-typing',
            'Repository should be typed with generic parameter: Repository<Entity>'
          )
        }
      }

      // Check for direct database access
      if (this.hasDirectDatabaseAccess(content)) {
        this.addError(
          file,
          'direct-db-access',
          'Services should use injected repositories, not direct database access'
        )
      }

      // Check for query builder patterns
      if (this.usesQueryBuilder(content)) {
        if (!this.hasProperQueryBuilderPattern(content)) {
          this.addWarning(
            file,
            'query-builder-pattern',
            'Use repository query builder methods: whereEqualTo(), orderByAscending(), limit(), etc.'
          )
        }
      }
    }

    // Check for pagination patterns
    for (const file of [...serviceFiles, ...repositoryFiles]) {
      const content = await this.readFile(file)

      if (this.hasPaginationLogic(content)) {
        if (!this.hasProperPaginationPattern(content)) {
          this.addWarning(
            file,
            'pagination-pattern',
            'Use .next(token).limit(pageSize) pattern for pagination with @hgraph/storage'
          )
        }
      }
    }

    // Check for N+1 query problems in GraphQL resolvers
    const resolverFiles = allFiles.filter(f => f.endsWith('.resolver.ts'))
    for (const file of resolverFiles) {
      const content = await this.readFile(file)

      if (this.hasFieldResolver(content) && !this.usesCachedRepository(repositoryFiles)) {
        this.addWarning(
          file,
          'n-plus-one-risk',
          'GraphQL field resolvers may cause N+1 queries. Consider using RepositoryWithIdCache'
        )
      }
    }
  }

  // Helper methods for @hgraph/storage validation
  private async detectHgraphStorageUsage(files: string[]): Promise<boolean> {
    for (const file of files) {
      const content = await this.readFile(file)
      if (content.includes('@hgraph/storage') ||
          content.includes('StorageModule') ||
          content.includes('Repository<') ||
          content.includes('@InjectRepo')) {
        return true
      }
    }
    return false
  }

  private containsEntityDecorator(content: string): boolean {
    return /@Entity\(/.test(content)
  }

  private containsPrimaryColumn(content: string): boolean {
    return /@PrimaryColumn\(/.test(content) || /@PrimaryGeneratedColumn\(/.test(content)
  }

  private containsPropertyWithoutDecorator(content: string): boolean {
    // Check for class properties without @Column decorator
    const propertyPattern = /^\s*(public|private|protected)?\s*\w+\s*[!?]?\s*:\s*\w+/gm
    const columnPattern = /@Column\(/g

    const properties = content.match(propertyPattern) || []
    const columns = content.match(columnPattern) || []

    // If there are more properties than columns (accounting for primary column)
    return properties.length > columns.length + 1
  }

  private hasOptionalWithoutNullable(content: string): boolean {
    // Check for optional properties without nullable configuration
    return /\w+\?\s*:\s*\w+/.test(content) && !content.includes('nullable: true')
  }

  private extendsRepository(content: string): boolean {
    return /extends\s+(Repository|RepositoryWithIdCache|FirestoreRepository|FirestoreRepositoryWithIdCache)</.test(content)
  }

  private hasProperRepositoryConstructor(content: string): boolean {
    return /constructor\s*\([^)]*\)\s*{\s*super\s*\(/.test(content)
  }

  private containsBusinessLogic(content: string): boolean {
    // Check for complex logic patterns in repository
    const businessLogicPatterns = [
      /if\s*\([^)]+\)\s*{[\s\S]+}/,  // Complex conditionals
      /for\s*\(/,  // Loops
      /while\s*\(/,  // While loops
      /\.map\s*\(/,  // Array transformations
      /\.filter\s*\(/,  // Filtering logic
      /throw\s+new\s+\w+Error/,  // Business exceptions
    ]

    return businessLogicPatterns.some(pattern => pattern.test(content))
  }

  private shouldUseCaching(content: string): boolean {
    // Check if the repository is likely used with GraphQL
    return content.includes('GraphQL') || content.includes('resolver') || content.includes('FieldResolver')
  }

  private hasCachingDecorator(content: string): boolean {
    return /@WithCache\(/.test(content) || /RepositoryWithIdCache/.test(content)
  }

  private hasStorageModuleForRoot(content: string): boolean {
    return /StorageModule\.forRoot\(/.test(content)
  }

  private hasHardcodedCredentials(content: string): boolean {
    // Check for hardcoded database URLs or passwords
    return /url\s*:\s*['"`]postgres:\/\//.test(content) ||
           /password\s*:\s*['"`]\w+['"`]/.test(content) ||
           /host\s*:\s*['"`][\w.]+['"`]/.test(content)
  }

  private hasStorageModuleForFeature(content: string): boolean {
    return /StorageModule\.forFeature\(/.test(content)
  }

  private usesRepository(content: string): boolean {
    return /Repository</.test(content) || /repository/i.test(content)
  }

  private hasInjectRepoDecorator(content: string): boolean {
    return /@InjectRepo\(/.test(content)
  }

  private hasProperRepositoryTyping(content: string): boolean {
    return /:\s*Repository<\w+>/.test(content) ||
           /:\s*RepositoryWithIdCache<\w+>/.test(content)
  }

  private hasDirectDatabaseAccess(content: string): boolean {
    // Check for direct TypeORM or database access
    return /getConnection\(/.test(content) ||
           /createQueryBuilder\(/.test(content) ||
           /getRepository\(/.test(content) ||
           /dataSource\./.test(content)
  }

  private usesQueryBuilder(content: string): boolean {
    return /query\s*=>/.test(content) || /\.find\(/.test(content) || /\.findOne\(/.test(content)
  }

  private hasProperQueryBuilderPattern(content: string): boolean {
    // Check for @hgraph/storage query builder methods
    return /\.whereEqualTo\(/.test(content) ||
           /\.whereBetween\(/.test(content) ||
           /\.whereIn\(/.test(content) ||
           /\.orderByAscending\(/.test(content) ||
           /\.orderByDescending\(/.test(content)
  }

  private hasPaginationLogic(content: string): boolean {
    return /page|pagination|limit|offset|skip/i.test(content)
  }

  private hasProperPaginationPattern(content: string): boolean {
    return /\.next\(/.test(content) && /\.limit\(/.test(content)
  }

  private hasFieldResolver(content: string): boolean {
    return /@ResolveField\(/.test(content) || /@FieldResolver\(/.test(content)
  }

  private async usesCachedRepository(repositoryFiles: string[]): Promise<boolean> {
    for (const file of repositoryFiles) {
      const content = await this.readFile(file)
      if (this.hasCachingDecorator(content)) {
        return true
      }
    }
    return false
  }

  private async hasAnyEntitiesInProject(files: string[]): Promise<boolean> {
    for (const file of files) {
      const content = await this.readFile(file)
      if (this.containsEntityDecorator(content)) {
        return true
      }
    }
    return false
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

  private containsObjectTypeModel(content: string): boolean {
    // Check for @ObjectType decorator that's not a response
    return /@ObjectType\(/.test(content) && !this.containsGraphQLResponse(content)
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