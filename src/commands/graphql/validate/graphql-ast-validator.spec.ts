import * as fs from 'fs'
import * as path from 'path'
import {
  GraphQLASTValidator as GraphQLValidator,
  ValidationRules,
  ValidationResult,
} from './graphql-ast-validator'
import { glob } from 'glob'

// Mock the glob module
jest.mock('glob')

// Mock fs.promises.readFile
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
  },
}))

describe('GraphQLValidator', () => {
  let validator: GraphQLValidator
  const mockRootPath = '/test/project'
  const allRules: ValidationRules = {
    checkInputFiles: true,
    checkResponseFiles: true,
    checkModelFiles: true,
    checkModuleNaming: true,
    checkResolverFiles: true,
    checkServiceFiles: true,
    checkResolverEndpoints: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    validator = new GraphQLValidator(mockRootPath, allRules)
  })

  describe('Module Detection', () => {
    it('should correctly group files by module', async () => {
      const mockFiles = [
        'src/user/user.module.ts',
        'src/user/user.service.ts',
        'src/user/user.resolver.ts',
        'src/user/user.model.ts',
        'src/user/user.input.ts',
        'src/user/user.response.ts',
        'src/product/product.module.ts',
        'src/product/product.service.ts',
        'src/app.module.ts',
      ]

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      expect(result.modules).toContain('user')
      expect(result.modules).toContain('product')
      expect(result.modules).toContain('app')
      expect(result.checkedFiles).toBe(9)
    })

    it('should extract module name from nested structures', async () => {
      const mockFiles = [
        'src/modules/user/user.module.ts',
        'src/domains/product/product.module.ts',
        'user/user.service.ts',
      ]

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      expect(result.modules).toContain('user')
      expect(result.modules).toContain('product')
    })
  })

  describe('Input File Validation', () => {
    it('should pass when input types are in .input.ts files', async () => {
      const mockFiles = ['src/user/user.input.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.input.ts')) {
          return Promise.resolve(`
            @InputType()
            export class CreateUserInput {
              @Field()
              name: string;
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors).toHaveLength(0)
      expect(result.valid).toBe(true)
    })

    it('should fail when input types are in wrong files', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.service.ts')) {
          return Promise.resolve(`
            @Injectable()
            export class UserService {
              // Service implementation
            }

            @InputType()
            export class CreateUserInput {
              @Field()
              name: string;
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].rule).toBe('input-location')
      expect(result.errors[0].message).toContain('should be in .input.ts files')
      expect(result.valid).toBe(false)
    })

    it('should detect input classes by naming pattern', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue(`
        @Injectable()
        export class UserService {
          // Service implementation
        }

        export class UpdateUserInput {
          name: string;
        }
      `)

      const result = await validator.validate()

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].rule).toBe('input-location')
    })
  })

  describe('Response File Validation', () => {
    it('should pass when response types are in .response.ts files', async () => {
      const mockFiles = ['src/user/user.response.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.response.ts')) {
          return Promise.resolve(`
            @ObjectType()
            export class LoginResponse {
              @Field()
              token: string;
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors).toHaveLength(0)
      expect(result.valid).toBe(true)
    })

    it('should fail when response types are in wrong files', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.service.ts')) {
          return Promise.resolve(`
            @Injectable()
            export class UserService {
              // Service implementation
            }

            @ObjectType()
            export class UserResponse {
              @Field()
              success: boolean;
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].rule).toBe('response-location')
      expect(result.errors[0].message).toContain('should be in .response.ts files')
      expect(result.valid).toBe(false)
    })

    it('should detect response classes by naming pattern', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue(`
        @Injectable()
        export class UserService {
          // Service implementation
        }

        export class LoginResponse {
          token: string;
        }
      `)

      const result = await validator.validate()

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].rule).toBe('response-location')
    })
  })

  describe('Model File Validation', () => {
    it('should pass when models are in .model.ts files', async () => {
      const mockFiles = ['src/user/user.model.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.model.ts')) {
          return Promise.resolve(`
            @Entity()
            @ObjectType()
            export class User {
              @Field()
              id: string;
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors).toHaveLength(0)
      expect(result.valid).toBe(true)
    })

    it('should fail when Entity decorators are in wrong files', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.service.ts')) {
          return Promise.resolve(`
            @Injectable()
            export class UserService {
              // Service implementation
            }

            @Entity()
            export class User {
              id: string;
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].rule).toBe('model-location')
      expect(result.errors[0].message).toContain('should be in .model.ts files')
      expect(result.valid).toBe(false)
    })

    it('should fail when ObjectType (non-response) is in wrong files', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.service.ts')) {
          return Promise.resolve(`
            @Injectable()
            export class UserService {
              // Service implementation
            }

            @ObjectType()
            export class User {
              @Field()
              id: string;
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].rule).toBe('model-location')
      expect(result.valid).toBe(false)
    })
  })

  describe('Module Naming Validation', () => {
    it('should pass when module follows naming convention', async () => {
      const mockFiles = ['src/user/user.module.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      const moduleWarnings = result.warnings.filter(w => w.rule === 'module-naming')
      const moduleErrors = result.errors.filter(e => e.rule === 'module-naming')

      expect(moduleWarnings).toHaveLength(0)
      expect(moduleErrors).toHaveLength(0)
    })

    it('should fail when module has wrong file name', async () => {
      const mockFiles = ['src/user/module.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      expect(result.warnings.some(w => w.rule === 'missing-module')).toBe(true)
    })

    it('should warn when module is not in correct directory structure', async () => {
      const mockFiles = ['src/wrongpath/user.module.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      const pathWarning = result.warnings.find(w => w.rule === 'module-path')
      expect(pathWarning).toBeDefined()
      expect(pathWarning?.message).toContain('should be at path ending with')
    })

    it('should warn when module is missing', async () => {
      const mockFiles = ['src/user/user.service.ts', 'src/user/user.resolver.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue(
        '@Injectable() export class UserService {}',
      )

      const result = await validator.validate()

      const missingWarning = result.warnings.find(w => w.rule === 'missing-module')
      expect(missingWarning).toBeDefined()
      expect(missingWarning?.message).toContain('missing a .module.ts file')
    })
  })

  describe('App Module Special Case', () => {
    it('should not warn about app.module.ts path', async () => {
      const mockFiles = ['src/app.module.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      const pathWarnings = result.warnings.filter(
        w => w.file.includes('app.module.ts') && w.rule === 'module-path',
      )
      expect(pathWarnings).toHaveLength(0)
    })

    it('should not warn about missing resolver for app module', async () => {
      const mockFiles = ['src/app.module.ts', 'src/app.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      const resolverWarnings = result.warnings.filter(
        w => w.file === 'app' && w.rule === 'missing-resolver',
      )
      expect(resolverWarnings).toHaveLength(0)
    })

    it('should allow app.module.ts at root src directory', async () => {
      const mockFiles = ['src/app.module.ts', 'src/user/user.module.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      expect(result.modules).toContain('app')
      expect(result.modules).toContain('user')

      // No warnings for app module structure
      const appWarnings = result.warnings.filter(w => w.file.includes('app'))
      expect(appWarnings).toHaveLength(0)
    })
  })

  describe('Resolver File Validation', () => {
    it('should pass when resolvers are in .resolver.ts files', async () => {
      const mockFiles = ['src/user/user.resolver.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.resolver.ts')) {
          return Promise.resolve(`
            @Resolver(() => User)
            export class UserResolver {
              @Query(() => [User])
              async users() {
                return [];
              }
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors.filter(e => e.rule === 'resolver-class')).toHaveLength(0)
    })

    it('should fail when resolver file lacks @Resolver decorator', async () => {
      const mockFiles = ['src/user/user.resolver.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.resolver.ts')) {
          return Promise.resolve(`
            export class UserResolver {
              async users() {
                return [];
              }
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      const resolverError = result.errors.find(e => e.rule === 'resolver-class')
      expect(resolverError).toBeDefined()
      expect(resolverError?.message).toContain('should contain a class decorated with @Resolver()')
    })

    it('should warn when resolver file is empty', async () => {
      const mockFiles = ['src/user/user.resolver.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.resolver.ts')) {
          return Promise.resolve(`
            @Resolver()
            export class UserResolver {
              // No queries, mutations, or subscriptions
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      const emptyWarning = result.warnings.find(w => w.rule === 'empty-resolver')
      expect(emptyWarning).toBeDefined()
      expect(emptyWarning?.message).toContain('does not contain any Query, Mutation, Subscription')
    })

    it('should warn when module is missing resolver files', async () => {
      const mockFiles = ['src/user/user.module.ts', 'src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      const missingResolver = result.warnings.find(w => w.rule === 'missing-resolver')
      expect(missingResolver).toBeDefined()
      expect(missingResolver?.message).toContain('missing resolver files')
    })
  })

  describe('Service File Validation', () => {
    it('should pass when services have @Injectable decorator', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.service.ts')) {
          return Promise.resolve(`
            @Injectable()
            export class UserService {
              async findAll() {
                return [];
              }
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors.filter(e => e.rule === 'service-class')).toHaveLength(0)
    })

    it('should fail when service file lacks @Injectable decorator', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.service.ts')) {
          return Promise.resolve(`
            export class UserHelper {
              async findAll() {
                return [];
              }
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      const serviceError = result.errors.find(e => e.rule === 'service-class')
      expect(serviceError).toBeDefined()
      expect(serviceError?.message).toContain('should contain a class decorated with @Injectable()')
    })

    it('should pass when service follows naming pattern without decorator', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.service.ts')) {
          return Promise.resolve(`
            export class UserService {
              async findAll() {
                return [];
              }
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      // Should pass because class name ends with Service
      expect(result.errors.filter(e => e.rule === 'service-class')).toHaveLength(0)
    })
  })

  describe('GraphQL Endpoint Validation', () => {
    it('should pass when GraphQL operations are in resolver files', async () => {
      const mockFiles = ['src/user/user.resolver.ts']

      let globCallCount = 0
      ;(glob as jest.Mock).mockImplementation(() => {
        globCallCount++
        if (globCallCount === 1) {
          return Promise.resolve(mockFiles)
        } else {
          // No non-resolver files to check
          return Promise.resolve([])
        }
      })
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.resolver.ts')) {
          return Promise.resolve(`
            @Resolver()
            export class UserResolver {
              @Query(() => [User])
              async users() { return []; }

              @Mutation(() => User)
              async createUser() { return new User(); }

              @Subscription(() => User)
              async userAdded() { return null; }

              @ResolveField(() => String)
              async fullName() { return 'test'; }
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors.filter(e => e.rule === 'resolver-location')).toHaveLength(0)
    })

    it('should fail when @Query is in service file', async () => {
      const mockFiles = ['src/user/user.service.ts']

      let globCallCount = 0
      ;(glob as jest.Mock).mockImplementation(() => {
        globCallCount++
        if (globCallCount === 1) {
          return Promise.resolve(mockFiles)
        } else {
          return Promise.resolve(['src/user/user.service.ts'])
        }
      })
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.service.ts')) {
          return Promise.resolve(`
            @Injectable()
            export class UserService {
              @Query(() => [User])
              async users() {
                return [];
              }
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      const locationError = result.errors.find(e => e.rule === 'resolver-location')
      expect(locationError).toBeDefined()
      expect(locationError?.message).toContain('should only be in .resolver.ts files')
    })

    it('should fail when @Mutation is in wrong file', async () => {
      const mockFiles = ['src/user/user.controller.ts']

      let globCallCount = 0
      ;(glob as jest.Mock).mockImplementation(() => {
        globCallCount++
        if (globCallCount === 1) {
          return Promise.resolve(mockFiles)
        } else {
          return Promise.resolve(['src/user/user.controller.ts'])
        }
      })
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.controller.ts')) {
          return Promise.resolve(`
            export class UserController {
              @Mutation(() => User)
              async createUser() {
                return new User();
              }
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors.some(e => e.rule === 'resolver-location')).toBe(true)
    })

    it('should fail when @FieldResolver is in wrong file', async () => {
      const mockFiles = ['src/user/user.model.ts']

      let globCallCount = 0
      ;(glob as jest.Mock).mockImplementation(() => {
        globCallCount++
        if (globCallCount === 1) {
          return Promise.resolve(mockFiles)
        } else {
          return Promise.resolve(['src/user/user.model.ts'])
        }
      })
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.model.ts')) {
          return Promise.resolve(`
            @ObjectType()
            export class User {
              @FieldResolver(() => String)
              async fullName() {
                return 'test';
              }
            }
          `)
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.errors.some(e => e.rule === 'resolver-location')).toBe(true)
    })
  })

  describe('Validation with Disabled Rules', () => {
    it('should skip input validation when disabled', async () => {
      const rulesWithDisabledInput: ValidationRules = {
        ...allRules,
        checkInputFiles: false,
      }

      validator = new GraphQLValidator(mockRootPath, rulesWithDisabledInput)

      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue(`
        @InputType()
        export class CreateUserInput {
          name: string;
        }
      `)

      const result = await validator.validate()

      expect(result.errors.filter(e => e.rule === 'input-location')).toHaveLength(0)
    })

    it('should skip response validation when disabled', async () => {
      const rulesWithDisabledResponse: ValidationRules = {
        ...allRules,
        checkResponseFiles: false,
      }

      validator = new GraphQLValidator(mockRootPath, rulesWithDisabledResponse)

      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue(`
        @Injectable()
        export class UserService {
          // Service implementation
        }

        export class UserResponse {
          success: boolean;
        }
      `)

      const result = await validator.validate()

      expect(result.errors.filter(e => e.rule === 'response-location')).toHaveLength(0)
    })

    it('should skip model validation when disabled', async () => {
      const rulesWithDisabledModel: ValidationRules = {
        ...allRules,
        checkModelFiles: false,
      }

      validator = new GraphQLValidator(mockRootPath, rulesWithDisabledModel)

      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue(`
        @Entity()
        export class User {
          id: string;
        }
      `)

      const result = await validator.validate()

      expect(result.errors.filter(e => e.rule === 'model-location')).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty project with no files', async () => {
      ;(glob as jest.Mock).mockResolvedValue([])

      const result = await validator.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.checkedFiles).toBe(0)
      expect(result.modules).toHaveLength(0)
    })

    it('should handle file read errors gracefully', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'))

      const result = await validator.validate()

      // Should handle error gracefully and continue
      expect(result.checkedFiles).toBe(1)
    })

    it('should handle files without module association', async () => {
      const mockFiles = ['random.ts', 'test.spec.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue('')

      const result = await validator.validate()

      // Files without module should not be processed
      expect(result.modules).toHaveLength(0)
    })

    it('should ignore test and spec files', async () => {
      const mockFiles = [
        'src/user/user.service.ts',
        'src/user/user.service.spec.ts',
        'src/user/user.service.test.ts',
      ]

      ;(glob as jest.Mock).mockResolvedValue(['src/user/user.service.ts']) // glob should filter out test files
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue(
        '@Injectable() export class UserService {}',
      )

      const result = await validator.validate()

      expect(result.checkedFiles).toBe(1) // Only non-test file
    })

    it('should handle multiple violations in single file', async () => {
      const mockFiles = ['src/user/user.service.ts']

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('user.service.ts')) {
          return Promise.resolve(`
            @Injectable()
            export class UserService {
              @InputType()
              export class CreateUserInput {
                name: string;
              }

              @ObjectType()
              export class UserResponse {
                success: boolean;
              }

              @Entity()
              export class User {
                id: string;
              }

              @Query(() => [User])
              async getUsers() {
                return [];
              }
            }
          `)
        }
        return Promise.resolve('')
      })

      // Mock glob to return service file for non-resolver check
      let globCallCount = 0
      ;(glob as jest.Mock).mockImplementation(() => {
        globCallCount++
        if (globCallCount === 1) {
          return Promise.resolve(mockFiles)
        } else {
          return Promise.resolve(['src/user/user.service.ts'])
        }
      })

      const result = await validator.validate()

      // Should detect all violations
      expect(result.errors.length).toBeGreaterThanOrEqual(3)
      expect(result.errors.some(e => e.rule === 'input-location')).toBe(true)
      expect(result.errors.some(e => e.rule === 'response-location')).toBe(true)
      expect(result.errors.some(e => e.rule === 'model-location')).toBe(true)
      expect(result.errors.some(e => e.rule === 'resolver-location')).toBe(true)
    })
  })

  describe('Complex Module Structures', () => {
    it('should handle module with all correct files', async () => {
      const mockFiles = [
        'src/user/user.module.ts',
        'src/user/user.service.ts',
        'src/user/user.resolver.ts',
        'src/user/user.model.ts',
        'src/user/user.input.ts',
        'src/user/user.response.ts',
      ]

      let globCallCount = 0
      ;(glob as jest.Mock).mockImplementation(() => {
        globCallCount++
        if (globCallCount === 1) {
          return Promise.resolve(mockFiles)
        } else {
          // Return non-resolver files for second call
          return Promise.resolve(mockFiles.filter(f => !f.includes('.resolver.ts')))
        }
      })
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('.module.ts')) {
          return Promise.resolve('@Module() export class UserModule {}')
        }
        if (path.includes('.service.ts')) {
          return Promise.resolve('@Injectable() export class UserService {}')
        }
        if (path.includes('.resolver.ts')) {
          return Promise.resolve('@Resolver() export class UserResolver { @Query() users() {} }')
        }
        if (path.includes('.model.ts')) {
          return Promise.resolve('@Entity() @ObjectType() export class User {}')
        }
        if (path.includes('.input.ts')) {
          return Promise.resolve('@InputType() export class CreateUserInput {}')
        }
        if (path.includes('.response.ts')) {
          return Promise.resolve('@ObjectType() export class UserResponse {}')
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle multiple modules with different structures', async () => {
      const mockFiles = [
        'src/app.module.ts',
        'src/user/user.module.ts',
        'src/user/user.resolver.ts',
        'src/modules/product/product.module.ts',
        'src/modules/product/product.resolver.ts',
        'src/domains/order/order.module.ts',
        'src/domains/order/order.resolver.ts',
      ]

      ;(glob as jest.Mock).mockResolvedValue(mockFiles)
      ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
        const path = filePath.toString()
        if (path.includes('.resolver.ts')) {
          return Promise.resolve('@Resolver() export class Resolver { @Query() test() {} }')
        }
        return Promise.resolve('')
      })

      const result = await validator.validate()

      expect(result.modules).toContain('app')
      expect(result.modules).toContain('user')
      expect(result.modules).toContain('product')
      expect(result.modules).toContain('order')
      expect(result.checkedFiles).toBe(7)
    })
  })
})
