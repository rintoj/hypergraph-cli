# GraphQL Validation Rules - Detailed Guide

## Validation Rules by Category

### I. File Location Rules

These rules enforce that specific code patterns are in the correct file types.

#### 1. Input Type Location Rule
- **Rule ID:** `input-location` / `checkInputFiles`
- **Enforces:** `@InputType()` classes in `.input.ts` files only
- **Method:** `validateInputFiles()`
- **Severity:** ERROR
- **Line:** 225-306 in graphql-ast-validator.ts

**Check Pattern:**
```
Looks for: @InputType() decorator on class declarations
In: .input.ts files
Validates: Properties decorated with @Field() don't have unnecessary validators
Errors on: Found in non-.input.ts files
```

**Additional Validator Check:**
- Flags unnecessary validators: `@IsEnum`, `@IsString`, `@IsNumber`, `@IsBoolean`, `@IsInt`, `@IsArray`, `@IsObject`, `@IsDate`
- **Error ID:** `unnecessary-validation`
- **Reason:** GraphQL layer enforces types; validators are redundant

#### 2. Response Type Location Rule
- **Rule ID:** `response-location` / `checkResponseFiles`
- **Enforces:** `@ObjectType()` classes in `.response.ts` files (response DTOs)
- **Method:** `validateModelFiles()` (part of)
- **Severity:** ERROR
- **Line:** 369-399 in graphql-ast-validator.ts

**Check Pattern:**
```
Looks for: @ObjectType() classes with "Response" in name
In: Non-.response.ts files
Errors on: Found in wrong location
```

#### 3. Entity Location Rule
- **Rule ID:** `model-location` / `checkModelFiles`
- **Enforces:** `@Entity()` classes in `.model.ts` files only
- **Method:** `validateModelFiles()` (part of)
- **Severity:** ERROR
- **Line:** 308-399 in graphql-ast-validator.ts

**Check Pattern:**
```
Looks for: @Entity() decorator on class declarations
In: Non-.model.ts files
Errors on: TypeORM entities in other file types
Skips: .input.ts, .response.ts, .model.ts (already correct)
```

#### 4. Non-Response ObjectType Location Rule
- **Rule ID:** `model-location` / `checkModelFiles`
- **Enforces:** `@ObjectType()` (non-response) in `.model.ts` files
- **Method:** `validateModelFiles()` (part of)
- **Severity:** ERROR
- **Detection:** Uses `isResponseClass()` helper (line 952-956)
  - Checks if class name contains "Response"

### II. File Existence Rules

#### 5. Entity File Deprecation
- **Rule ID:** `entity-file-not-allowed` / `checkEntityFiles`
- **Enforces:** No `.entity.ts` files should exist
- **Method:** `validateEntityFiles()`
- **Severity:** ERROR
- **Message:** Use `.model.ts` instead

#### 6. Missing Module File
- **Rule ID:** `missing-module` / `checkModuleNaming`
- **Enforces:** Module must have `.module.ts` file if it contains NestJS files
- **Method:** `validateModuleNaming()`
- **Severity:** WARNING
- **Condition:** Only required if module has:
  - `.resolver.ts` files, OR
  - `.controller.ts` files, OR
  - `.service.ts` files, OR
  - `.model.ts` files
- **Exception:** `app` module is exempt

### III. File Naming Rules

#### 7. Module File Naming
- **Rule ID:** `module-naming` / `checkModuleNaming`
- **Enforces:** Module file follows pattern `[moduleName].module.ts`
- **Method:** `validateModuleNaming()`
- **Severity:** WARNING
- **Exception:** `app` module
- **Line:** 732-742

#### 8. Module Path Structure
- **Rule ID:** `module-path` / `checkModuleNaming`
- **Enforces:** Module file at `[moduleName]/[moduleName].module.ts`
- **Method:** `validateModuleNaming()`
- **Severity:** WARNING
- **Exception:** `app` module
- **Line:** 744-752

### IV. Class Structure Rules

#### 9. Resolver Class Decorator
- **Rule ID:** `resolver-class` / `checkResolverFiles`
- **Enforces:** `.resolver.ts` files must have a class with `@Resolver()` decorator
- **Method:** `validateResolverFiles()`
- **Severity:** ERROR
- **Line:** 659-665

#### 10. Service Class Definition
- **Rule ID:** `service-class` / `checkServiceFiles`
- **Enforces:** `.service.ts` files must have:
  - `@Injectable()` decorator, OR
  - Class name ending with "Service"
- **Method:** `validateServiceFiles()`
- **Severity:** ERROR
- **Line:** 680-710

#### 11. Entity Column Decorators
- **Rule ID:** `missing-column-decorator` / `checkEntityFiles`
- **Enforces:** Entity properties must have:
  - `@Column()` or other column decorator, OR
  - Relation decorator (`@ManyToOne`, `@OneToMany`, etc.), OR
  - Be computed fields (resolved via field resolver)
- **Method:** `validateEntityProperties()`
- **Severity:** WARNING
- **Column Decorators Recognized:**
  - `@Column`, `@PrimaryColumn`, `@PrimaryGeneratedColumn`
  - `@CreateDateColumn`, `@UpdateDateColumn`, `@DeleteDateColumn`
  - `@VersionColumn`, `@Generated`
- **Relation Decorators Recognized:**
  - `@ManyToOne`, `@OneToMany`, `@OneToOne`, `@ManyToMany`
  - `@JoinColumn`, `@JoinTable`, `@RelationId`
- **Computed Field Detection:** Checks `resolverFields` Map (collected in first pass)

### V. GraphQL Operation Rules

#### 12. Resolver Location
- **Rule ID:** `resolver-location` / `checkResolverEndpoints`
- **Enforces:** GraphQL operations only in `.resolver.ts` files
- **Method:** `validateResolverEndpoints()` → (traverses all non-resolver files)
- **Severity:** ERROR
- **Operations Checked:**
  - `@Query()`, `@Mutation()`, `@Subscription()`
  - `@ResolveField()`, `@FieldResolver()`
- **Line:** 771-796

#### 13. Multiple Args Decorators
- **Rule ID:** `multiple-args-decorators` / `checkResolverEndpoints`
- **Enforces:** Max 1 `@Args()` decorator per GraphQL operation
- **Method:** `validateResolverArguments()`
- **Severity:** ERROR
- **Applied To:** `@Query()`, `@Mutation()`, `@Subscription()` methods only
- **Skips:** `@ResolveField()`, `@FieldResolver()` (can have multiple @Args)
- **Line:** 807-887
- **Error Details:**
  - Main error: Lists all @Args decorators and suggests combining into input type
  - Per-parameter errors: Indicates each extra parameter

**Example Error:**
```
Method 'users' has 4 @Args() decorators (@Args('groupId'), @Args('role'), @Args('cursor'), @Args('limit')).
When there are multiple arguments, combine them into a single input type.
```

#### 14. Event Publishing Location
- **Rule ID:** `event-in-resolver` / `checkResolverEndpoints`
- **Enforces:** Event publishing methods only in service layer
- **Method:** `validateEventPublishing()`
- **Severity:** ERROR
- **Methods Detected:**
  - `.emit()`, `.publish()`, `.dispatchEvent()`, `.publishEvent()`
- **Error on:** These methods called in `.resolver.ts` files
- **Line:** 889-920

### VI. Query Chain Rules

#### 15. HGraph Storage WhereIn Positioning
- **Rule ID:** `hgraph-storage-wherein` / `checkHgraphStorage`
- **Enforces:** `.whereIn()` must be the last method in @hgraph/storage query chains
- **Method:** `validateHgraphStorageChains()`
- **Severity:** ERROR
- **Line:** 922-962 in graphql-ast-validator.ts
- **Detection Strategy:**
  1. Check for imports from '@hgraph/storage'
  2. Extract method call chains using AST traversal
  3. Validate `.whereIn()` is at the end of the chain (if present)

**Check Pattern:**
```typescript
// Incorrect - whereIn() followed by other methods
q.whereIn('id', ids).whereEqualTo('isActive', true)  // ERROR

// Correct - whereIn() is last
q.whereEqualTo('isActive', true).whereIn('id', ids)  // OK
```

**Helper Methods:**
- `hasImportFrom()` - Line 967-980: Checks if file imports from specified module
- `extractMethodChain()` - Line 987-1004: Extracts method call sequence from AST
  - Returns array in reverse order (last call first)
  - Example: `q.whereEqualTo().whereIn()` → `['whereIn', 'whereEqualTo']`

**Example Error:**
```
.whereIn() must be the last method in the query chain. Found .whereEqualTo() after .whereIn()
```

### VII. Unimplemented Rules

#### 16. Repository Files
- **Rule ID:** `checkRepositoryFiles`
- **Status:** DEFINED but NOT IMPLEMENTED
- **Location in Code:**
  - Interface: Line 34
  - Command: Line 62
  - Not called in `validateModule()`

## Validation Flow Diagram

```
validate()
├─ Load .gitignore patterns
├─ Find all .ts files (glob)
├─ Create TypeScript AST program
├─ Group files by module
│  └─ Extract module names from paths
├─ PASS 1: Collect resolver fields
│  └─ For each resolver, extract field names
│     (used to identify computed properties)
├─ PASS 2: Validate each module
│  └─ Categorize files by extension
│  └─ For each enabled rule:
│     ├─ validateInputFiles()
│     ├─ validateModelFiles()
│     ├─ validateEntityFiles()
│     ├─ validateResolverFiles()
│     ├─ validateServiceFiles()
│     ├─ validateModuleNaming()
│     ├─ validateResolverEndpoints()
│     │  ├─ validateResolverArguments()
│     │  └─ validateEventPublishing()
│     └─ validateHgraphStorageChains()
├─ Enrich errors with code snippets
└─ Return ValidationResult
```

## AST Node Types Used

| Node Type | Purpose | Lines |
|-----------|---------|-------|
| `ts.ClassDeclaration` | Detect class definitions | Throughout |
| `ts.Decorator` | Extract decorator info | 928-950 |
| `ts.PropertyDeclaration` | Validate entity properties | 271, 468 |
| `ts.MethodDeclaration` | Find GraphQL operations | 648, 814 |
| `ts.Identifier` | Extract names from AST | Throughout |
| `ts.CallExpression` | Detect method calls | 899, 935, 991 |
| `ts.PropertyAccessExpression` | Detect property access (e.g., `this.emit()`) | 903, 994 |
| `ts.ImportDeclaration` | Check module imports | 971 |
| `ts.StringLiteral` | Extract import module names | 973 |

## Error Message Components

Each validation error contains:

1. **file:** Relative path to source file
2. **line:** 1-based line number of error
3. **rule:** Rule ID (e.g., "input-location")
4. **message:** Human-readable description
5. **severity:** "error" or "warning"
6. **snippet:** Optional code context
   - Format: `[indicator] [lineNum] | [code]`
   - Indicator: `>` for error line, ` ` for context
   - Shows 2 lines before, error line, 1 line after

**Example Snippet:**
```
  41 | import { InputType } from '@nestjs/graphql'
> 42 | @InputType()
  43 | export class UserInput {
```

## Testing Considerations

### What's Working
- Module detection tests
- File categorization tests
- Resolver file presence tests
- Service file tests
- Basic configuration tests

### What's Skipped
- AST-based tests with mocked content
- Reason: TypeScript program doesn't parse mocked file content
- Status: Tests use `.skip` to prevent CI failures

### How to Run Tests
```bash
npm test graphql-ast-validator.spec.ts
```

## Rule Dependencies

### No Direct Dependencies
All validation rules are independent - they can be enabled/disabled without affecting others.

### Implicit Dependencies
1. **Module Detection** → All other rules
   - Module detection must succeed for file grouping
2. **Resolver Field Collection** (Pass 1) → Entity validation (Pass 2)
   - Collects resolver field names for computed property detection
3. **Resolver Endpoints** → Resolver Arguments & Event Publishing
   - Parent validation that calls sub-validations

## Adding New Rules - Checklist

- [ ] Add boolean flag to `ValidationRules` interface
- [ ] Enable flag in `graphql-validate-command.ts` rules object
- [ ] Create `private async validate[RuleName]()` method
- [ ] Call method from `validateModule()` with rule check
- [ ] Use `addError()` or `addWarning()` for issues
- [ ] Extract line numbers with `getLineNumber(sourceFile, node.getStart(sourceFile))`
- [ ] Add comprehensive test suite
- [ ] Update documentation/help text
- [ ] Test with real project files (not mocked)

## Performance Notes

- **File Discovery:** Uses `glob` with .gitignore support
- **AST Creation:** Single `ts.createProgram()` for all files (efficient)
- **Two-Pass Strategy:** First pass collects data, second pass validates (prevents re-traversal)
- **Module Grouping:** Files processed by module for better organization

## Known Limitations

1. Tests with mocked file content don't work well with TypeScript program
2. Repository file validation stub only
3. No auto-fix functionality (marked as not implemented)
4. Line numbers may be inaccurate for complex expressions
5. HGraph storage validation only checks `.whereIn()` positioning - other query builder methods not yet validated
