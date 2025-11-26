# GraphQL Validation System Architecture

## Overview

The GraphQL validation system in hypergraph-cli is a TypeScript AST (Abstract Syntax Tree) based validator that analyzes source code structure and enforces project conventions. It's designed to validate GraphQL module structure, naming conventions, and proper separation of concerns.

## Key Components

### 1. Entry Point: `graphql validate` Command
**File:** `/Users/rintoj/projects/hypergraph-packages/hypergraph-cli/src/commands/graphql/validate/graphql-validate-command.ts`

- Implements the CLI command interface using `clifer`
- Accepts options: `--path`, `--fix`, `--strict`, `--json`
- Defines validation rules to enable/disable
- Handles output formatting (human-readable or JSON)

**Key Props Interface:**
```typescript
interface Props {
  path?: string      // Path to project root
  fix?: boolean      // Auto-fix (not implemented)
  strict?: boolean   // Treat warnings as errors
  json?: boolean     // JSON output for CI/CD
}
```

### 2. Main Validator: `GraphQLASTValidator`
**File:** `/Users/rintoj/projects/hypergraph-packages/hypergraph-cli/src/commands/graphql/validate/graphql-ast-validator.ts`

#### Core Interfaces

**ValidationResult:**
```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  checkedFiles: number
  modules: string[]
}
```

**ValidationError:**
```typescript
interface ValidationError {
  file: string
  line?: number
  rule: string
  message: string
  severity: 'error' | 'warning'
  snippet?: string  // Code context (3 lines)
}
```

**ValidationRules:**
```typescript
interface ValidationRules {
  checkInputFiles: boolean         // .input.ts location enforcement
  checkResponseFiles: boolean      // .response.ts location enforcement
  checkModelFiles: boolean         // .model.ts location enforcement
  checkModuleNaming: boolean       // Module naming conventions
  checkResolverFiles: boolean      // Resolver class requirements
  checkServiceFiles: boolean       // Service class requirements
  checkResolverEndpoints: boolean  // GraphQL operation location
  checkHgraphStorage: boolean      // @hgraph/storage chain validations
  checkEntityFiles: boolean        // Entity file validation
  checkRepositoryFiles: boolean    // Repository file validation
}
```

#### Validation Flow

1. **Initialization**
   - Creates TypeScript program with AST compiler options
   - Loads .gitignore patterns
   - Collects all .ts files (excludes node_modules, dist, build, test files)

2. **Module Detection** (`groupFilesByModule()`)
   - Extracts module names from file paths
   - Supports patterns: `src/modules/[module]`, `src/domains/[module]`, `src/[module]`
   - Groups files by module for batch processing

3. **Two-Pass Validation**
   - **Pass 1:** Collect resolver fields for computed property detection
   - **Pass 2:** Validate each module and file

4. **Error Enrichment**
   - Adds code snippets (3 lines context) to errors
   - Uses 1-based line numbering

## Validation Rules Implementation

### 1. Input File Validation (`validateInputFiles`)
- **Rule:** Input types must be in `.input.ts` files
- **Detects:** `@InputType()` decorator on fields
- **Checks for unnecessary validators:** `@IsEnum`, `@IsString`, `@IsNumber`, etc.
- **Severity:** Error

**Related validation errors:**
- `unnecessary-validation`: Type validators on GraphQL fields

### 2. Model File Validation (`validateModelFiles`)
- **Rules:** 
  - `@Entity()` must be in `.model.ts`
  - `@ObjectType()` (non-response) must be in `.model.ts`
  - `@InputType()` must be in `.input.ts`
  - Response `@ObjectType()` must be in `.response.ts`
- **Severity:** Error

**Detection mechanism:**
- Identifies response classes by name pattern (contains "Response")
- Checks all files except `.input.ts` and `.response.ts`

### 3. Entity File Validation (`validateEntityFiles`)
- **Rule:** `.entity.ts` files are not allowed; use `.model.ts` instead
- **Additional checks:**
  - Validates properties have `@Column()` or relation decorators
  - Excludes computed fields (resolved via field resolvers)
- **Severity:** Error for file existence, Warning for missing decorators

### 4. Resolver File Validation (`validateResolverFiles`)
- **Requirements:**
  - Must have `@Resolver()` class decorator
  - Should contain at least one GraphQL operation
  - Should not be empty
- **Severity:** Error for missing `@Resolver()`, Warning for empty resolvers

### 5. Service File Validation (`validateServiceFiles`)
- **Requirements:**
  - Must have `@Injectable()` decorator OR class name ending with "Service"
- **Severity:** Error

### 6. Module Naming Validation (`validateModuleNaming`)
- **Rules:**
  - Module file must be named `[moduleName].module.ts`
  - Module must be in directory: `[moduleName]/[moduleName].module.ts`
  - Module file is required only if module has NestJS files (resolver/controller/service/model)
- **Exceptions:** `app` module can be at root src
- **Severity:** Warning

### 7. Resolver Endpoints Validation (`validateResolverEndpoints`)
- **GraphQL operations location:** Only in `.resolver.ts` files
- **Operations checked:** `@Query()`, `@Mutation()`, `@Subscription()`, `@ResolveField()`, `@FieldResolver()`
- **Sub-validations:**
  - `validateResolverArguments`: Max 1 `@Args()` per endpoint
  - `validateEventPublishing`: Event publishing only in services

**Related validation errors:**
- `resolver-location`: Operations outside resolver files
- `multiple-args-decorators`: Multiple `@Args()` decorators on single endpoint
- `event-in-resolver`: Event publishing in resolvers instead of services

## AST Analysis Approach

### TypeScript Compiler API Usage
```typescript
// Create program with strict configuration
const program = ts.createProgram(absoluteFiles, {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  strict: false,
  noEmit: true,
})
```

### Node Traversal Pattern
```typescript
private visitNode(node: ts.Node, callback: (node: ts.Node) => void) {
  callback(node)
  node.forEachChild(child => this.visitNode(child, callback))
}
```

### Decorator Extraction
```typescript
private getDecorators(node: ts.HasDecorators): readonly ts.Decorator[] {
  if (ts.canHaveDecorators(node)) {
    const decorators = ts.getDecorators(node)
    return decorators || []
  }
  return []
}
```

## Current @hgraph/storage Integration

**Status:** Rule defined but not yet implemented (`checkHgraphStorage: true`)

**Location in code:**
- Defined in `ValidationRules` interface (line 32)
- Enabled by default in command (line 60)
- Not currently called in `validateModule()` method

**Expected scope:** Should validate query chain method positioning (e.g., `.whereIn()` placement)

## Architecture for Adding New Validation Rules

### Step 1: Add Rule to Interface
```typescript
// In ValidationRules interface (line 24-35)
export interface ValidationRules {
  // ... existing rules ...
  checkWhereInPositioning: boolean  // New rule
}
```

### Step 2: Enable Rule in Command
```typescript
// In graphql-validate-command.ts (run function, line 52-63)
const rules: ValidationRules = {
  // ... existing rules ...
  checkWhereInPositioning: true
}
```

### Step 3: Add Validation Method to GraphQLASTValidator
```typescript
private async validateWhereInPositioning(
  moduleName: string,
  queryChainFiles: string[],
  allFiles: string[]
) {
  if (!this.program) return
  
  for (const file of queryChainFiles) {
    const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
    if (!sourceFile) continue
    
    // Traverse AST and validate rule
    this.visitNode(sourceFile, node => {
      // Implement validation logic
    })
  }
}
```

### Step 4: Call New Method from validateModule
```typescript
// In validateModule method (line 177-244)
if (this.rules.checkWhereInPositioning) {
  await this.validateWhereInPositioning(moduleName, storageFiles, files)
}
```

### Step 5: Add Tests
```typescript
// In graphql-ast-validator.spec.ts
describe('.whereIn() Positioning Validation', () => {
  it('should pass when .whereIn() is in correct position', async () => {
    // Test implementation
  })
  
  it('should fail when .whereIn() is in wrong position', async () => {
    // Test implementation
  })
})
```

## Error Reporting Mechanism

### Adding Errors
```typescript
private addError(file: string, rule: string, message: string, line?: number) {
  this.errors.push({
    file,
    line,
    rule,
    message,
    severity: 'error',
  })
}
```

### Adding Warnings
```typescript
private addWarning(file: string, rule: string, message: string, line?: number) {
  this.warnings.push({
    file,
    line,
    rule,
    message,
    severity: 'warning',
  })
}
```

### Snippet Generation
```typescript
private extractSnippet(content: string, lineNumber: number): string | undefined {
  // Returns 5 lines total (2 before, 1 target, 1 after)
  // Format: `> 42 │ target code` (> indicates error line)
}
```

## File Categorization Logic

Files are categorized by suffix:
- `.input.ts` → Input types
- `.response.ts` → Response types
- `.model.ts` → Models/Entities
- `.entity.ts` → Entities (deprecated)
- `.repository.ts` → Repositories
- `.module.ts` → NestJS modules
- `.resolver.ts` → GraphQL resolvers
- `.service.ts` → Services
- Other → Miscellaneous

## Module Detection Strategy

Module names extracted from paths in order of precedence:
1. After `modules/` or `domains/` directory
2. After `src/` if next part isn't `modules` or `domains`
3. From filename pattern: `[name].(input|response|model|module|resolver|service).ts`

## Testing Architecture

**Test file:** `/Users/rintoj/projects/hypergraph-packages/hypergraph-cli/src/commands/graphql/validate/graphql-ast-validator.spec.ts`

**Approach:**
- Mocks `glob` for file discovery
- Mocks `fs.promises.readFile` for file content
- Note: Many tests are skipped (`.skip`) because TypeScript program doesn't parse mocked content

**Test Categories:**
- Module Detection
- Input File Validation
- Response File Validation
- Model File Validation
- Module Naming
- Resolver File Validation
- Service File Validation
- GraphQL Arguments Validation
- GraphQL Endpoint Validation
- Edge Cases
- Complex Module Structures

## Summary Table

| Rule | Type | Severity | Files | Method |
|------|------|----------|-------|--------|
| input-location | Error | Error | .input.ts | `validateInputFiles()` |
| response-location | Error | Error | .response.ts | `validateModelFiles()` |
| model-location | Error | Error | .model.ts | `validateModelFiles()` |
| entity-file-not-allowed | Error | Error | .entity.ts | `validateEntityFiles()` |
| missing-column-decorator | Warning | Warning | .model.ts | `validateEntityFiles()` |
| resolver-class | Error | Error | .resolver.ts | `validateResolverFiles()` |
| empty-resolver | Warning | Warning | .resolver.ts | `validateResolverFiles()` |
| service-class | Error | Error | .service.ts | `validateServiceFiles()` |
| module-naming | Warning | Warning | .module.ts | `validateModuleNaming()` |
| module-path | Warning | Warning | .module.ts | `validateModuleNaming()` |
| missing-module | Warning | Warning | Any | `validateModuleNaming()` |
| resolver-location | Error | Error | Not .resolver.ts | `validateResolverEndpoints()` |
| multiple-args-decorators | Error | Error | .resolver.ts | `validateResolverArguments()` |
| event-in-resolver | Error | Error | .resolver.ts | `validateEventPublishing()` |
| unnecessary-validation | Error | Error | .input.ts | `validateInputFiles()` |

## Key Design Patterns

1. **Two-Pass Validation:** Collects metadata first, then validates
2. **Rule-Driven Architecture:** Each rule is controlled by a boolean flag
3. **AST-Based Analysis:** Real parsing, not regex-based
4. **Decorator-Centric:** Heavily relies on NestJS/TypeTypeORM decorators
5. **Context-Rich Errors:** Includes line numbers and code snippets
6. **Module-First Grouping:** All validations organized by module

## Next Steps for .whereIn() Rule

To add the `.whereIn()` positioning validation:

1. **Research @hgraph/storage API**
   - Identify expected method chain signatures
   - Determine valid `.whereIn()` positions
   - Document anti-patterns

2. **Create validation logic**
   - Detect calls to `.whereIn()` in method chains
   - Identify position in chain
   - Compare against expected positions

3. **Add specific error messages**
   - "`.whereIn()` should be called before `.select()`"
   - "`.whereIn()` positioning violates query chain order"

4. **Add comprehensive tests**
   - Correct positioning scenarios
   - Incorrect positioning scenarios
   - Edge cases (nested chains, etc.)

5. **Update documentation**
   - Add rule to CLI help
   - Document expected patterns
   - Include examples of correct/incorrect usage
