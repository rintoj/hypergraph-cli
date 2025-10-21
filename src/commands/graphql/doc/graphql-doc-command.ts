import { command } from 'clifer'
import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'

const VALIDATION_DOCUMENTATION = `# GraphQL Project Structure Validation Rules

This document outlines the validation rules and expectations for GraphQL projects using the hypergraph CLI validation tool.

## Overview

The GraphQL validator ensures your project follows best practices and maintains a consistent structure across all modules. It validates file organization, naming conventions, and proper separation of concerns.

## Command Usage

\`\`\`bash
# Validate current directory
hypergraph graphql validate

# Validate specific directory
hypergraph graphql validate --path ./src

# Strict mode (treat warnings as errors)
hypergraph graphql validate --strict

# Output as JSON for CI/CD
hypergraph graphql validate --json
\`\`\`

## Project Structure Requirements

### ✅ Recommended Project Structure

\`\`\`
src/
├── app.module.ts           # Root module (special case - no resolver required)
├── app.service.ts          # Optional root service
├── user/                   # Feature module
│   ├── user.module.ts      # Module definition
│   ├── user.resolver.ts    # GraphQL resolver
│   ├── user.service.ts     # Business logic
│   ├── user.model.ts       # TypeORM entity & GraphQL ObjectType
│   ├── user.input.ts       # GraphQL input types
│   └── user.response.ts    # GraphQL response types
├── product/                # Another feature module
│   ├── product.module.ts
│   ├── product.resolver.ts
│   ├── product.service.ts
│   ├── product.model.ts
│   ├── product.input.ts
│   └── product.response.ts
└── shared/                 # Shared utilities
    ├── shared.module.ts
    └── ...
\`\`\`

## Validation Rules

### 1. 📥 Input Files (.input.ts)

**Rule:** All GraphQL input types must be defined in files ending with \`.input.ts\`

**Why:** Separating input types improves code organization and makes it easier to find and manage API contracts.

**✅ Correct:**
\`\`\`typescript
// user.input.ts
import { InputType, Field } from '@nestjs/graphql'

@InputType()
export class CreateUserInput {
  @Field()
  name: string

  @Field()
  email: string
}

@InputType()
export class UpdateUserInput extends CreateUserInput {
  @Field()
  id: string
}
\`\`\`

**❌ Incorrect:**
\`\`\`typescript
// user.service.ts (WRONG LOCATION!)
@InputType()
export class CreateUserInput {
  // Input types should not be in service files
}
\`\`\`

### 2. 📤 Response Files (.response.ts)

**Rule:** All GraphQL response types must be defined in files ending with \`.response.ts\`

**Why:** Response types represent the API output contract and should be clearly separated from internal models.

**✅ Correct:**
\`\`\`typescript
// auth.response.ts
import { ObjectType, Field } from '@nestjs/graphql'
import { User } from './user.model'

@ObjectType()
export class LoginResponse {
  @Field()
  accessToken: string

  @Field()
  refreshToken: string

  @Field(() => User)
  user: User
}

@ObjectType()
export class PaginatedUserResponse {
  @Field(() => [User])
  items: User[]

  @Field()
  total: number

  @Field()
  page: number

  @Field()
  pageSize: number
}
\`\`\`

**❌ Incorrect:**
\`\`\`typescript
// auth.resolver.ts (WRONG LOCATION!)
@ObjectType()
export class LoginResponse {
  // Response types should not be in resolver files
}
\`\`\`

### 3. 📊 Model Files (.model.ts)

**Rule:** All TypeORM entities and GraphQL object types must be in \`.model.ts\` files

**Why:** Models represent your data structure and should be the single source of truth for both database and GraphQL schema.

**✅ Correct:**
\`\`\`typescript
// user.model.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'
import { ObjectType, Field, ID } from '@nestjs/graphql'

@Entity('users')
@ObjectType()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string

  @Column({ unique: true })
  @Field()
  email: string

  @Column()
  @Field()
  firstName: string

  @Column()
  @Field()
  lastName: string

  @Column({ select: false }) // Not exposed in GraphQL
  password: string
}
\`\`\`

**❌ Incorrect:**
\`\`\`typescript
// user.service.ts (WRONG LOCATION!)
@Entity()
export class User {
  // Entities should not be in service files
}
\`\`\`

### 4. 📦 Module Files (.module.ts)

**Rule:** Module files must follow the pattern \`<module-name>/<module-name>.module.ts\`

**Exception:** \`app.module.ts\` can be placed at the root (\`src/app.module.ts\`)

**Why:** Consistent module naming makes the codebase predictable and easier to navigate.

**✅ Correct:**
\`\`\`typescript
// user/user.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './user.model'
import { UserService } from './user.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
\`\`\`

**❌ Incorrect:**
- \`user/module.ts\` - Wrong filename
- \`user/UserModule.ts\` - Wrong casing
- \`modules/user.module.ts\` - Wrong structure

### 5. 🎯 Resolver Files (.resolver.ts)

**Rule:** All GraphQL resolvers must be in files ending with \`.resolver.ts\`

**Exception:** The \`app\` module doesn't require a resolver file

**Why:** Resolvers define your GraphQL API endpoints and should be easily identifiable.

**✅ Correct:**
\`\`\`typescript
// user.resolver.ts
import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql'
import { User } from './user.model'
import { UserService } from './user.service'
import { CreateUserInput, UpdateUserInput } from './user.input'
import { PaginatedUserResponse } from './user.response'

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User)
  async user(@Args('id') id: string): Promise<User> {
    return this.userService.findById(id)
  }

  @Query(() => PaginatedUserResponse)
  async users(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('pageSize', { defaultValue: 10 }) pageSize: number,
  ): Promise<PaginatedUserResponse> {
    return this.userService.paginate(page, pageSize)
  }

  @Mutation(() => User)
  async createUser(@Args('input') input: CreateUserInput): Promise<User> {
    return this.userService.create(input)
  }

  @Mutation(() => User)
  async updateUser(
    @Args('id') id: string,
    @Args('input') input: UpdateUserInput,
  ): Promise<User> {
    return this.userService.update(id, input)
  }

  @ResolveField(() => String)
  async fullName(@Parent() user: User): Promise<string> {
    return \`\${user.firstName} \${user.lastName}\`
  }
}
\`\`\`

**❌ Incorrect:**
\`\`\`typescript
// user.service.ts (WRONG LOCATION!)
@Resolver()
export class UserResolver {
  // Resolvers should not be in service files
}
\`\`\`

### 6. ⚙️ Service Files (.service.ts)

**Rule:** All service classes must be in files ending with \`.service.ts\`

**Why:** Services contain business logic and should be separated from GraphQL-specific code.

**✅ Correct:**
\`\`\`typescript
// user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.model'
import { CreateUserInput, UpdateUserInput } from './user.input'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) {
      throw new NotFoundException(\`User with ID \${id} not found\`)
    }
    return user
  }

  async create(input: CreateUserInput): Promise<User> {
    const user = this.userRepository.create(input)
    return this.userRepository.save(user)
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    await this.userRepository.update(id, input)
    return this.findById(id)
  }
}
\`\`\`

**❌ Incorrect:**
\`\`\`typescript
// user.helper.ts (WRONG FILENAME!)
@Injectable()
export class UserService {
  // Services should be in .service.ts files
}
\`\`\`

### 7. 🔌 GraphQL Operations Location

**Rule:** All GraphQL operations (@Query, @Mutation, @Subscription, @ResolveField) must only be in \`.resolver.ts\` files

**Why:** Keeping GraphQL operations in resolver files maintains a clear separation between API layer and business logic.

**❌ Common Mistakes:**
\`\`\`typescript
// user.service.ts (WRONG!)
@Injectable()
export class UserService {
  @Query(() => User)  // ❌ Query should be in resolver
  async getUser() {
    // ...
  }
}

// user.model.ts (WRONG!)
@ObjectType()
export class User {
  @ResolveField()  // ❌ Field resolver should be in resolver
  async posts() {
    // ...
  }
}
\`\`\`

### 8. 🎯 GraphQL Arguments Pattern

**Rule:** Maximum of 1 direct @Args() decorator is allowed for any Query, Mutation, or Subscription. When you have multiple arguments, combine them into a single input type.

**Why:** Using input types for multiple arguments improves API consistency, makes the schema more maintainable, and enables better validation and documentation.

**✅ Correct - Single argument:**
\`\`\`typescript
// user.resolver.ts
@Query(() => User)
async user(@Args('id') id: string): Promise<User> {
  return this.userService.findById(id)
}
\`\`\`

**✅ Correct - Multiple arguments using input type:**
\`\`\`typescript
// user.input.ts
@InputType()
export class GetUsersInput {
  @Field({ nullable: true })
  role?: string

  @Field({ nullable: true })
  cursor?: string

  @Field(() => Int, { defaultValue: 50 })
  limit: number
}

// user.resolver.ts
@Query(() => [User])
async users(@Args('input') input: GetUsersInput): Promise<User[]> {
  return this.userService.findUsers(input)
}
\`\`\`

**❌ Incorrect - Multiple @Args() decorators:**
\`\`\`typescript
// user.resolver.ts (WRONG!)
@Query(() => [User])
async users(
  @Args('groupId') groupId: string,
  @Args('role', { nullable: true }) role?: string,
  @Args('cursor', { nullable: true }) cursor?: string,
  @Args('limit', { defaultValue: 50 }) limit?: number,
): Promise<User[]> {
  // ❌ Should use a single input type instead of multiple @Args()
  return this.userService.findUsers(groupId, role, cursor, limit)
}
\`\`\`

**Benefits of using Input Types:**
- **Type Safety**: Input types are strongly typed and validated
- **Reusability**: Same input type can be used across multiple resolvers
- **Documentation**: Better GraphQL schema documentation
- **Evolution**: Easier to add/remove fields without breaking existing clients
- **Validation**: Can add validation decorators to input class

### 9. 🚫 Event Publishing in Resolvers

**Rule:** Event publishing should only be done in the service layer, not in resolvers.

**Why:** Resolvers should be thin and only responsible for handling GraphQL queries/mutations. Business logic including event publishing belongs in the service layer for better separation of concerns, testability, and reusability.

**✅ Correct - Events in service:**
\`\`\`typescript
// user.service.ts
import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

@Injectable()
export class UserService {
  constructor(private eventEmitter: EventEmitter2) {}

  async createUser(input: CreateUserInput): Promise<User> {
    const user = await this.userRepository.save(input)

    // ✅ Event published in service
    this.eventEmitter.emit('user.created', { user })

    return user
  }
}

// user.resolver.ts
@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @Mutation(() => User)
  async createUser(@Args('input') input: CreateUserInput): Promise<User> {
    // ✅ Resolver delegates to service
    return this.userService.createUser(input)
  }
}
\`\`\`

**❌ Incorrect - Events in resolver:**
\`\`\`typescript
// user.resolver.ts (WRONG!)
@Resolver(() => User)
export class UserResolver {
  constructor(
    private userService: UserService,
    private eventEmitter: EventEmitter2, // ❌ Don't inject event emitter in resolver
  ) {}

  @Mutation(() => User)
  async createUser(@Args('input') input: CreateUserInput): Promise<User> {
    const user = await this.userService.createUser(input)

    // ❌ Don't publish events from resolver
    this.eventEmitter.emit('user.created', { user })

    return user
  }
}
\`\`\`

**Benefits:**
- **Separation of Concerns**: Keep resolvers thin and focused on GraphQL
- **Reusability**: Service methods can be called from multiple places
- **Testability**: Easier to test business logic separately
- **Consistency**: Events are published consistently across all entry points

### 10. ⚠️ Unnecessary Type Validation in Input Types

**Rule:** Type validation decorators (like @IsEnum, @IsString, @IsNumber) are unnecessary in GraphQL input types because type validation is already enforced by the GraphQL layer.

**Why:** GraphQL's type system already validates that fields match their declared types. Adding class-validator decorators for type checking creates redundant validation and can lead to confusing error messages.

**✅ Correct - Only business validation:**
\`\`\`typescript
// user.input.ts
import { InputType, Field } from '@nestjs/graphql'
import { IsEmail, MinLength, MaxLength } from 'class-validator'
import { UserRole } from './user.model'

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail() // ✅ Business validation (format check)
  email: string

  @Field()
  @MinLength(2) // ✅ Business validation (constraint)
  @MaxLength(50)
  name: string

  @Field(() => UserRole)
  role: UserRole // ✅ GraphQL handles enum validation

  @Field(() => Int)
  age: number // ✅ GraphQL handles type validation
}
\`\`\`

**❌ Incorrect - Redundant type validation:**
\`\`\`typescript
// user.input.ts (WRONG!)
import { InputType, Field } from '@nestjs/graphql'
import { IsEnum, IsString, IsNumber, IsEmail } from 'class-validator'
import { UserRole } from './user.model'

@InputType()
export class CreateUserInput {
  @Field()
  @IsString() // ❌ Redundant - GraphQL already validates this
  @IsEmail() // ✅ This is OK - validates email format
  email: string

  @Field(() => UserRole)
  @IsEnum(UserRole) // ❌ Redundant - GraphQL already validates enum
  role: UserRole

  @Field(() => Int)
  @IsNumber() // ❌ Redundant - GraphQL already validates this
  @IsInt() // ❌ Redundant - GraphQL already validates this
  age: number
}
\`\`\`

**Keep these validators (business logic):**
- ✅ @IsEmail() - Validates email format
- ✅ @MinLength() / @MaxLength() - String length constraints
- ✅ @Min() / @Max() - Number range constraints
- ✅ @IsUrl() - URL format validation
- ✅ @Matches() - Regex pattern matching
- ✅ @IsOptional() - Marks optional fields
- ✅ Custom validators - Business-specific rules

**Remove these validators (type checking):**
- ❌ @IsEnum() - GraphQL validates enum types
- ❌ @IsString() - GraphQL validates string types
- ❌ @IsNumber() / @IsInt() - GraphQL validates number types
- ❌ @IsBoolean() - GraphQL validates boolean types
- ❌ @IsArray() - GraphQL validates array types
- ❌ @IsObject() - GraphQL validates object types
- ❌ @IsDate() - GraphQL validates date types

## Special Cases & Exceptions

### 🏠 App Module Exception

The root \`app.module.ts\` has special handling:
- ✅ Can be placed directly in \`src/\` directory
- ✅ Doesn't require a resolver file
- ✅ Doesn't need to follow the \`<module>/<module>.module.ts\` pattern

\`\`\`typescript
// src/app.module.ts
import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserModule } from './user/user.module'
import { ProductModule } from './product/product.module'

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      playground: true,
    }),
    TypeOrmModule.forRoot({
      // ... database config
    }),
    UserModule,
    ProductModule,
  ],
})
export class AppModule {}
\`\`\`

## Validation Output

### Success Output
When all validations pass:
\`\`\`
🔍 Starting GraphQL structure validation...

✅ All validations passed!

📦 Modules found: 3
📄 Files checked: 18
\`\`\`

### Error Output
When violations are found:
\`\`\`
❌ Errors:

1. [input-location] src/user/user.service.ts
   GraphQL input types should be in .input.ts files

2. [resolver-location] src/product/product.service.ts
   GraphQL operations should only be in .resolver.ts files

⚠️ Warnings:

1. [empty-resolver] src/category/category.resolver.ts
   Resolver file does not contain any Query, Mutation, or Field resolvers
\`\`\`

## CI/CD Integration

### GitHub Actions
\`\`\`yaml
- name: Validate GraphQL Structure
  run: npx hypergraph graphql validate --strict
\`\`\`

### Pre-commit Hook
\`\`\`bash
#!/bin/sh
npx hypergraph graphql validate --strict || exit 1
\`\`\`

### Package.json Script
\`\`\`json
{
  "scripts": {
    "graphql:validate": "hypergraph graphql validate",
    "graphql:validate:strict": "hypergraph graphql validate --strict"
  }
}
\`\`\`

## Best Practices

1. **Run validation before commits** - Add to pre-commit hooks
2. **Use strict mode in CI/CD** - Treat warnings as errors in production
3. **Document exceptions** - If you must violate a rule, document why
4. **Keep modules focused** - Each module should have a single responsibility
5. **Use shared modules** - Common functionality should be in shared modules
6. **Follow NestJS conventions** - The validator aligns with NestJS best practices

## Benefits

- **🎯 Consistency** - Predictable file structure across the entire codebase
- **🔍 Discoverability** - Easy to find specific types of files
- **🛡️ Type Safety** - Clear separation between inputs, outputs, and models
- **📚 Documentation** - File structure serves as implicit documentation
- **👥 Team Collaboration** - New developers can quickly understand the project
- **🔧 Maintainability** - Easier to refactor and extend
- **🚀 Scalability** - Structure scales well with project growth

## Common Patterns

### Feature Module Pattern
Each feature should be a self-contained module:
\`\`\`
feature/
├── feature.module.ts       # Module configuration
├── feature.resolver.ts     # GraphQL API
├── feature.service.ts      # Business logic
├── feature.model.ts        # Data model
├── feature.input.ts        # Input DTOs
├── feature.response.ts     # Response DTOs
├── feature.repository.ts   # Data access (optional)
└── feature.guard.ts        # Auth guards (optional)
\`\`\`

### Shared Module Pattern
Common functionality should be extracted:
\`\`\`
shared/
├── shared.module.ts
├── services/
│   ├── email.service.ts
│   └── cache.service.ts
├── guards/
│   └── auth.guard.ts
└── decorators/
    └── current-user.decorator.ts
\`\`\`

## Troubleshooting

### Module Not Detected
- Ensure files follow naming conventions
- Check that module name matches in all files
- Verify module is exported from index files if using barrels

### False Positives
- Check decorator usage is standard
- Ensure imports are correct
- Verify file extensions are correct

### Performance Issues
- Use \`--path\` to limit validation scope
- Exclude node_modules and dist directories
- Consider running validation in parallel in CI/CD

## @hgraph/storage Integration Validation

When using \`@hgraph/storage\` library, additional validation rules are applied to ensure proper integration with TypeORM and NestJS.

### 11. 🗄️ Entity/Model Files (.model.ts)

**Rule:** When using @hgraph/storage, TypeORM entities should preferably be in \`.model.ts\` files

**Why:** Consistent with @hgraph/storage conventions where models represent both database entities and GraphQL types.

**✅ Correct:**
\`\`\`typescript
// user.model.ts (preferred for @hgraph/storage)
import { Entity, Column, PrimaryColumn } from 'typeorm'
import { ObjectType, Field } from '@nestjs/graphql'

@Entity()
@ObjectType()
export class User {
  @PrimaryColumn()
  @Field()
  id!: string

  @Column()
  @Field()
  name!: string

  @Column({ nullable: true })
  @Field({ nullable: true })
  bio?: string

  @Column()
  @Field()
  email!: string
}
\`\`\`

Note: Both \`.model.ts\` and \`.entity.ts\` files are accepted, but \`.model.ts\` is preferred when using @hgraph/storage as it typically combines both TypeORM entity and GraphQL type definitions.

**Key Requirements:**
- Use \`@Entity()\` decorator for all domain models
- \`@PrimaryColumn()\` or \`@PrimaryGeneratedColumn()\` for identifiers
- \`@Column()\` for all persistent properties
- Set \`nullable: true\` for optional fields

**❌ Common Mistakes:**
\`\`\`typescript
// Missing decorators
export class User {
  id: string  // ❌ Missing @PrimaryColumn
  name: string  // ❌ Missing @Column
}

// Optional without nullable
@Entity()
export class User {
  @Column()  // ❌ Should be @Column({ nullable: true })
  bio?: string
}
\`\`\`

### 12. 📚 Repository Files (.repository.ts)

**Rule:** Repository classes must extend proper base classes from @hgraph/storage

**Why:** Ensures consistent data access patterns and enables caching optimizations.

**✅ Correct Patterns:**

**Standard Repository:**
\`\`\`typescript
// user.repository.ts
import { Repository } from '@hgraph/storage'
import { User } from './user.model'

export class UserRepository extends Repository<User> {
  constructor() {
    super(User)
  }
}
\`\`\`

**With ID Caching (Recommended for GraphQL):**
\`\`\`typescript
// user.repository.ts
import { RepositoryWithIdCache } from '@hgraph/storage'
import { User } from './user.model'

export class UserRepository extends RepositoryWithIdCache<User> {
  constructor() {
    super(User)
  }
}
\`\`\`

**With Custom Caching:**
\`\`\`typescript
// user.repository.ts
import { Repository, WithCache } from '@hgraph/storage'
import { User } from './user.model'

@WithCache('email')
export class UserRepository extends Repository<User> {
  constructor() {
    super(User)
  }
}
\`\`\`

**❌ Common Mistakes:**
\`\`\`typescript
// Business logic in repository
export class UserRepository extends Repository<User> {
  async createUserWithValidation(data: CreateUserInput) {
    // ❌ Business logic should be in service
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email')
    }
    return this.save(data)
  }
}

// Missing constructor
export class UserRepository extends Repository<User> {
  // ❌ Missing constructor with super() call
}
\`\`\`

### 13. 💉 Service Dependency Injection

**Rule:** Services must use \`@InjectRepo()\` decorator for repository injection

**Why:** Proper dependency injection ensures testability and follows NestJS patterns.

**✅ Correct:**
\`\`\`typescript
// user.service.ts
import { Injectable } from '@nestjs/common'
import { InjectRepo } from '@hgraph/storage'
import { Repository } from '@hgraph/storage'
import { User } from './user.model'

@Injectable()
export class UserService {
  constructor(
    @InjectRepo(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find()
  }

  async findWithPagination(token?: string) {
    const { items, next } = await this.userRepository.find(query =>
      query
        .whereEqualTo('active', true)
        .orderByDescending('createdAt')
        .next(token)
        .limit(20)
    )
    return { items, nextToken: next }
  }
}
\`\`\`

**❌ Common Mistakes:**
\`\`\`typescript
// Missing @InjectRepo decorator
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: Repository<User>  // ❌ Missing @InjectRepo
  ) {}
}

// Direct database access
@Injectable()
export class UserService {
  async getUsers() {
    // ❌ Should use injected repository
    const connection = getConnection()
    return connection.getRepository(User).find()
  }
}

// Wrong query pattern
async findUsers() {
  // ❌ Should use @hgraph/storage query builder
  return this.userRepository.createQueryBuilder('user')
    .where('user.active = :active', { active: true })
    .getMany()
}
\`\`\`

### 14. 📦 Module Configuration

**Rule:** Modules must properly configure StorageModule

**Why:** Ensures entities are registered and database connections are configured.

**✅ Root Module Configuration:**
\`\`\`typescript
// app.module.ts
import { Module } from '@nestjs/common'
import { StorageModule, RepositoryType } from '@hgraph/storage'

@Module({
  imports: [
    StorageModule.forRoot({
      repositoryType: RepositoryType.TypeORM,
      type: process.env.DB_TYPE as any,
      url: process.env.DATABASE_URL,
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class AppModule {}
\`\`\`

**✅ Feature Module Configuration:**
\`\`\`typescript
// user/user.module.ts
import { Module } from '@nestjs/common'
import { StorageModule } from '@hgraph/storage'
import { User } from './user.model'
import { UserService } from './user.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [StorageModule.forFeature([User])],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
\`\`\`

**❌ Common Mistakes:**
\`\`\`typescript
// Hardcoded credentials
StorageModule.forRoot({
  url: 'postgres://user:pass@localhost:5432/db',  // ❌ Use environment variables
})

// Missing entity registration
@Module({
  // ❌ Missing StorageModule.forFeature([User])
  providers: [UserService],
})
export class UserModule {}
\`\`\`

### 15. 🔍 Query Patterns

**Rule:** Use @hgraph/storage query builder methods

**Why:** Consistent query patterns that work across different databases.

**✅ Correct Query Patterns:**
\`\`\`typescript
// Filtering
const activeUsers = await repo.find(query =>
  query
    .whereEqualTo('active', true)
    .whereIn('role', ['admin', 'user'])
    .whereBetween('age', 18, 65)
)

// Sorting
const recentUsers = await repo.find(query =>
  query.orderByDescending('createdAt').limit(10)
)

// Pagination
const { items, next } = await repo.find(query =>
  query.next(pageToken).limit(20)
)

// Caching
const cachedUsers = await repo.find(query =>
  query.whereEqualTo('featured', true).cache(60000)
)
\`\`\`

### 16. 🚀 Performance Optimizations

**N+1 Query Prevention:**
\`\`\`typescript
// Use RepositoryWithIdCache for GraphQL resolvers
@Resolver(() => User)
export class UserResolver {
  constructor(
    @InjectRepo(User)
    private readonly userRepo: RepositoryWithIdCache<User>,
  ) {}

  @ResolveField(() => User)
  async author(@Parent() post: Post) {
    // ID cache prevents repeated queries
    return this.userRepo.findById(post.authorId)
  }
}
\`\`\`

### 17. 🔥 Firestore-Specific Rules

When using Firestore backend:

\`\`\`typescript
// app.module.ts
StorageModule.forRoot({
  repositoryType: RepositoryType.Firestore,
  serviceAccountConfig: process.env.FIREBASE_SERVICE_ACCOUNT,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
})

// user.repository.ts
import { FirestoreRepositoryWithIdCache } from '@hgraph/storage'

export class UserRepository extends FirestoreRepositoryWithIdCache<User> {
  constructor() {
    super(User)
  }
}
\`\`\`

**Firestore Limitations:**
- ❌ No text contains/ends-with searches
- ❌ No case-insensitive operations
- ❌ No join queries
- ❌ No soft delete

### 18. 🧪 Testing Patterns

**Mock Database Testing:**
\`\`\`typescript
import { initializeMockDataSource } from '@hgraph/storage/testing'

beforeEach(async () => {
  await initializeMockDataSource({
    type: 'postgres',
    entities: [User],
    synchronize: true,
  })
})
\`\`\`

## Validation Error Reference

### General GraphQL Validation Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| \`input-location\` | @InputType decorator in wrong file | Move to .input.ts file |
| \`response-location\` | Response @ObjectType in wrong file | Move to .response.ts file |
| \`model-location\` | Entity or ObjectType in wrong file | Move to .model.ts file |
| \`resolver-location\` | GraphQL operations outside resolver | Move to .resolver.ts file |
| \`multiple-args-decorators\` | More than 1 @Args() in endpoint | Combine into single input type |
| \`event-in-resolver\` | Event publishing in resolver | Move emit/publish to service layer |
| \`unnecessary-validation\` | Type validation in input types | Remove @IsEnum, @IsString, etc. Keep business validators |
| \`missing-column-decorator\` | Entity property lacks decorator | Add @Column() or relation decorator |
| \`entity-file-not-allowed\` | Using .entity.ts files | Move entities to .model.ts files |

### @hgraph/storage Specific Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| \`entity-location\` | @Entity decorator in wrong file | Move to .model.ts or .entity.ts file |
| \`entity-naming\` | Using .entity.ts instead of .model.ts | Consider renaming to .model.ts |
| \`missing-entity-decorator\` | Entity file lacks @Entity() | Add @Entity() decorator |
| \`missing-primary-column\` | No primary key defined | Add @PrimaryColumn() or @PrimaryGeneratedColumn() |
| \`missing-column-decorator\` | Property lacks @Column() | Add @Column() to persistent properties |
| \`nullable-configuration\` | Optional property not nullable | Add { nullable: true } to @Column() |
| \`repository-location\` | Repository in wrong file | Move to .repository.ts file |
| \`repository-inheritance\` | Not extending Repository base | Extend Repository<T> or similar |
| \`repository-constructor\` | Missing super() call | Add constructor with super(Entity) |
| \`repository-logic\` | Business logic in repository | Move to service layer |
| \`repository-caching\` | Missing cache optimization | Use RepositoryWithIdCache for GraphQL |
| \`missing-inject-repo\` | Missing @InjectRepo decorator | Add @InjectRepo(Entity) to constructor |
| \`repository-typing\` | Repository not typed | Use Repository<Entity> type |
| \`direct-db-access\` | Bypassing repository pattern | Use injected repositories |
| \`query-builder-pattern\` | Wrong query syntax | Use @hgraph/storage query methods |
| \`pagination-pattern\` | Improper pagination | Use .next().limit() pattern |
| \`n-plus-one-risk\` | Potential N+1 queries | Use RepositoryWithIdCache |
| \`storage-module-root\` | Missing StorageModule.forRoot() | Add to app.module.ts imports |
| \`storage-config\` | Incomplete configuration | Add repositoryType and database config |
| \`hardcoded-credentials\` | Security risk | Use environment variables |
| \`storage-module-feature\` | Missing forFeature() | Register entities in module |

## Support

For issues or questions:
- Run \`hypergraph graphql rules\` to see this documentation
- Check the project repository for updates
- Report issues at the project's issue tracker
- @hgraph/storage documentation: https://github.com/rintoj/hypergraph-storage

---

*Generated by hypergraph GraphQL validator v1.1.0 with @hgraph/storage support*
`

async function run() {
  console.log(chalk.blue('📚 GraphQL Validation Documentation\n'))
  console.log(VALIDATION_DOCUMENTATION)

  // Also offer to save to file
  console.log(chalk.gray('\n' + '─'.repeat(60)))
  console.log(chalk.yellow('\n💡 Tip: To save this documentation to a file, use:'))
  console.log(chalk.gray('   hypergraph graphql rules > graphql-validation-rules.md\n'))
}

export default command('rules')
  .description('Display GraphQL validation rules and documentation')
  .handle(run)
