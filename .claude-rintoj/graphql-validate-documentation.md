# GraphQL Validation Command Documentation

## Overview

The `hypergraph graphql validate` command is a comprehensive validation tool that ensures your GraphQL project follows proper file structure and naming conventions. It helps maintain consistency and best practices across your GraphQL modules.

## Installation

The command is integrated into the hypergraph CLI. After updating the CLI, the command will be available.

## Usage

```bash
# Basic usage - validate current directory
hypergraph graphql validate

# Validate a specific directory
hypergraph graphql validate --path ./src

# Strict mode - treat warnings as errors
hypergraph graphql validate --strict

# Output results as JSON (useful for CI/CD)
hypergraph graphql validate --json

# Combination of options
hypergraph graphql validate --path ./src --strict --json
```

## Command Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--path` | string | Path to the project root to validate | Current directory |
| `--strict` | boolean | Treat warnings as errors | false |
| `--json` | boolean | Output results as JSON format | false |
| `--fix` | boolean | Auto-fix issues where possible (future feature) | false |

## Validation Rules

The validator enforces the following rules for GraphQL projects:

**Special Exception**: The `app` module (typically `src/app.module.ts` in NestJS projects) is treated as a special case:
- It doesn't need to follow the `<module>/<module>.module.ts` naming convention
- It doesn't require a resolver file
- It can be placed directly in the `src` directory

### 1. Input Files (.input.ts)
- **Rule**: All GraphQL input types must be defined in files ending with `.input.ts`
- **Example**: `user.input.ts`, `create-product.input.ts`
- **Detects**: `@InputType()` decorators and classes ending with `Input`

```typescript
// ✅ Correct: user.input.ts
@InputType()
export class CreateUserInput {
  @Field()
  name: string;

  @Field()
  email: string;
}

// ❌ Wrong: user.service.ts
@InputType() // This should be in .input.ts file
export class UpdateUserInput {
  // ...
}
```

### 2. Response Files (.response.ts)
- **Rule**: All GraphQL response types must be defined in files ending with `.response.ts`
- **Example**: `user.response.ts`, `auth.response.ts`
- **Detects**: Classes ending with `Response` and `@ObjectType()` decorators for responses

```typescript
// ✅ Correct: auth.response.ts
@ObjectType()
export class LoginResponse {
  @Field()
  token: string;

  @Field(() => User)
  user: User;
}

// ❌ Wrong: auth.resolver.ts
@ObjectType() // Response types should be in .response.ts
export class RefreshTokenResponse {
  // ...
}
```

### 3. Model Files (.model.ts)
- **Rule**: All TypeORM entities and GraphQL object types must be in `.model.ts` files
- **Example**: `user.model.ts`, `product.model.ts`
- **Detects**: `@Entity()` decorators (TypeORM) and `@ObjectType()` decorators (GraphQL)

```typescript
// ✅ Correct: user.model.ts
@Entity()
@ObjectType()
export class User {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  name: string;
}

// ❌ Wrong: user.service.ts
@Entity() // Entities should be in .model.ts
export class UserProfile {
  // ...
}
```

### 4. Module Naming Convention
- **Rule**: Module files must follow the pattern `<module-name>/<module-name>.module.ts`
- **Example**: `user/user.module.ts`, `auth/auth.module.ts`
- **Exception**: `app.module.ts` is allowed at the root (`src/app.module.ts`) and doesn't require a resolver

```typescript
// ✅ Correct structure:
src/
  app.module.ts       // Root module (EXCEPTION: allowed at src root)
  user/
    user.module.ts    // Module definition
    user.service.ts   // Service
    user.resolver.ts  // Resolver
    user.model.ts     // Model
    user.input.ts     // Inputs
    user.response.ts  // Responses

// ❌ Wrong:
src/
  user/
    module.ts         // Should be user.module.ts
    UserModule.ts     // Should be user.module.ts
```

### 5. Resolver Files (.resolver.ts)
- **Rule**: All GraphQL resolvers must be in files ending with `.resolver.ts`
- **Example**: `user.resolver.ts`, `auth.resolver.ts`
- **Exception**: The `app` module doesn't require a resolver file
- **Detects**: `@Resolver()` decorator

```typescript
// ✅ Correct: user.resolver.ts
@Resolver(() => User)
export class UserResolver {
  @Query(() => [User])
  async users() {
    // ...
  }

  @Mutation(() => User)
  async createUser(@Args('input') input: CreateUserInput) {
    // ...
  }
}

// ❌ Wrong: user.service.ts
@Resolver() // Resolvers should be in .resolver.ts
export class UserResolver {
  // ...
}
```

### 6. Service Files (.service.ts)
- **Rule**: All service classes must be in files ending with `.service.ts`
- **Example**: `user.service.ts`, `auth.service.ts`
- **Detects**: `@Injectable()` decorator and classes ending with `Service`

```typescript
// ✅ Correct: user.service.ts
@Injectable()
export class UserService {
  async findAll() {
    // ...
  }
}

// ❌ Wrong: user.helper.ts
@Injectable() // Services should be in .service.ts
export class UserService {
  // ...
}
```

### 7. GraphQL Endpoints in Resolvers
- **Rule**: All GraphQL operations (Query, Mutation, Subscription, Field Resolvers) must be defined only in `.resolver.ts` files
- **Detects**: `@Query()`, `@Mutation()`, `@Subscription()`, `@ResolveField()`, `@FieldResolver()`

```typescript
// ✅ Correct: All GraphQL operations in resolver file
// user.resolver.ts
@Resolver(() => User)
export class UserResolver {
  @Query(() => User)
  async user(@Args('id') id: string) {
    // ...
  }

  @Mutation(() => User)
  async updateUser(@Args('input') input: UpdateUserInput) {
    // ...
  }

  @ResolveField(() => [Post])
  async posts(@Parent() user: User) {
    // ...
  }
}

// ❌ Wrong: GraphQL operations outside resolver
// user.service.ts
export class UserService {
  @Query(() => User) // This should be in .resolver.ts
  async getUser(id: string) {
    // ...
  }
}
```

## Output Format

### Human-Readable Output (Default)

```
🔍 Starting GraphQL structure validation...

Validating: /path/to/project
Mode: normal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Validation Summary

📦 Modules found: 3
   • user
   • auth
   • product

📄 Files checked: 42
❌ Errors: 2
⚠️  Warnings: 1

❌ Errors:

1. [input-location] src/user/user.service.ts
   GraphQL input types should be in .input.ts files, found in user.service.ts

2. [resolver-location] src/auth/auth.service.ts
   GraphQL operations (Query, Mutation, Subscription, Field resolvers) should only be in .resolver.ts files

⚠️  Warnings:

1. [empty-resolver] src/product/product.resolver.ts
   Resolver file does not contain any Query, Mutation, Subscription, or Field resolvers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Validation Rules Applied:

✓ All GraphQL inputs must be in .input.ts files
✓ All responses must be in .response.ts files
✓ All models (TypeORM & GraphQL) must be in .model.ts files
✓ Module files must follow naming convention: <module>/<module>.module.ts
✓ All resolvers must be in .resolver.ts files
✓ All services must be in .service.ts files
✓ All GraphQL endpoints must be in resolver files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Validation failed!

Please fix the errors listed above.
```

### JSON Output (--json flag)

```json
{
  "valid": false,
  "errors": [
    {
      "file": "src/user/user.service.ts",
      "rule": "input-location",
      "message": "GraphQL input types should be in .input.ts files, found in user.service.ts",
      "severity": "error"
    },
    {
      "file": "src/auth/auth.service.ts",
      "rule": "resolver-location",
      "message": "GraphQL operations (Query, Mutation, Subscription, Field resolvers) should only be in .resolver.ts files",
      "severity": "error"
    }
  ],
  "warnings": [
    {
      "file": "src/product/product.resolver.ts",
      "rule": "empty-resolver",
      "message": "Resolver file does not contain any Query, Mutation, Subscription, or Field resolvers",
      "severity": "warning"
    }
  ],
  "checkedFiles": 42,
  "modules": ["user", "auth", "product"]
}
```

## Exit Codes

- `0`: Validation passed (or only warnings in non-strict mode)
- `1`: Validation failed (errors found, or warnings in strict mode)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: GraphQL Validation

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Validate GraphQL structure
        run: npx hypergraph graphql validate --strict --json
```

### GitLab CI Example

```yaml
graphql-validate:
  stage: test
  script:
    - npm ci
    - npx hypergraph graphql validate --strict --json
  only:
    - merge_requests
    - main
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run GraphQL validation
npx hypergraph graphql validate --strict

# Exit with validation result
exit $?
```

## Module Detection

The validator automatically detects modules based on:

1. **Directory structure**: Looks for common patterns like `src/modules/[module-name]` or `src/[module-name]`
2. **File naming**: Extracts module names from files like `user.service.ts`, `auth.resolver.ts`
3. **Nested modules**: Supports nested module structures
4. **Special handling**: The `app` module is treated as a special case (root module)

### Example Module Structures

```
# Standard NestJS structure
src/
  app.module.ts        # Root module (special case - no resolver required)
  app.service.ts       # Optional app service
  modules/
    user/
      user.module.ts
      user.service.ts
      user.resolver.ts

# Flat structure
src/
  app.module.ts        # Root module
  user/
    user.module.ts
    user.service.ts
    user.resolver.ts

# Domain-driven structure
src/
  app.module.ts        # Root module
  domains/
    user/
      infrastructure/
        user.module.ts
      application/
        user.service.ts
      presentation/
        user.resolver.ts
```

## Best Practices

1. **Run validation in CI/CD**: Add the validation step to your continuous integration pipeline
2. **Use strict mode in production**: Enable `--strict` flag for production branches
3. **Fix errors immediately**: Don't let validation errors accumulate
4. **Document exceptions**: If you need to violate a rule, document why in comments
5. **Regular validation**: Run validation before committing changes

## Troubleshooting

### Common Issues

1. **Module not detected**
   - Ensure your files follow the naming convention
   - Check that the module directory structure is consistent

2. **False positives**
   - The validator uses regex patterns to detect decorators
   - Ensure decorator usage is standard

3. **Performance issues**
   - Use `--path` to limit validation to specific directories
   - Exclude `node_modules`, `dist`, and `build` directories (done automatically)

## Future Enhancements

- **Auto-fix capability**: Automatically reorganize files to meet conventions
- **Custom rules**: Allow project-specific validation rules
- **IDE integration**: VSCode extension for real-time validation
- **Migration tool**: Automated migration from non-compliant structures
- **Report generation**: HTML/PDF reports for documentation

## Contributing

To contribute to the GraphQL validation command:

1. Fork the repository
2. Create a feature branch
3. Add tests for new validation rules
4. Submit a pull request

## Support

For issues or questions:
- Create an issue in the hypergraph-cli repository
- Check the documentation for updates
- Join the community discussions