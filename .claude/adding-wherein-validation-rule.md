# Adding .whereIn() Validation Rule for @hgraph/storage

This guide provides step-by-step instructions for implementing the `.whereIn()` positioning validation rule.

## Current Status

The validation rule infrastructure for @hgraph/storage exists but is not yet implemented:

- **Rule Flag Defined:** `checkHgraphStorage: boolean` (line 32)
- **Rule Enabled:** `checkHgraphStorage: true` (line 60 in command)
- **Not Called:** No implementation in `validateModule()` method

## Implementation Steps

### Step 1: Understand the Rule Requirements

First, document what `.whereIn()` positioning means in @hgraph/storage:

**Example (correct):**
```typescript
const users = await storage
  .query(User)
  .whereIn('role', ['admin', 'moderator'])
  .select('id', 'name', 'email')
  .execute()
```

**Example (incorrect):**
```typescript
const users = await storage
  .query(User)
  .select('id', 'name', 'email')
  .whereIn('role', ['admin', 'moderator'])  // ERROR: should be before select
  .execute()
```

**Document:**
- Valid method sequences
- Where `.whereIn()` can appear
- Where `.whereIn()` cannot appear
- Any related methods that affect positioning rules

### Step 2: Add Rule to ValidationRules Interface

**File:** `/Users/rintoj/projects/hypergraph-packages/hypergraph-cli/src/commands/graphql/validate/graphql-ast-validator.ts`

**Current (line 24-35):**
```typescript
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
```

**Action:** Already exists - `checkHgraphStorage` is already defined!

### Step 3: Create Validation Method

**Location:** Add to `GraphQLASTValidator` class in same file

**Pattern (use existing method as template):**
```typescript
private async validateHgraphStorageChains(
  moduleName: string,
  allFiles: string[]
) {
  if (!this.program) return
  
  // Find files that import @hgraph/storage
  for (const file of allFiles) {
    const sourceFile = this.program.getSourceFile(path.join(this.rootPath, file))
    if (!sourceFile) continue
    
    // Check if file imports from @hgraph/storage
    const hasStorageImport = await this.checkImport(sourceFile, '@hgraph/storage')
    if (!hasStorageImport) continue
    
    // Traverse AST and find storage query chains
    this.visitNode(sourceFile, node => {
      if (ts.isCallExpression(node)) {
        // Detect storage.query(...) chain starts
        // Extract method calls in sequence
        // Validate .whereIn() positioning
        
        const methodChain = this.extractMethodChain(node)
        const whereInIndex = methodChain.findIndex(m => m === 'whereIn')
        
        if (whereInIndex !== -1) {
          // Validate positioning rules
          if (!this.isValidWhereInPosition(methodChain, whereInIndex)) {
            const line = this.getLineNumber(sourceFile, node.getStart(sourceFile))
            this.addError(
              file,
              'wherein-positioning',
              `.whereIn() must be called before certain methods in the query chain`,
              line,
            )
          }
        }
      }
    })
  }
}
```

### Step 4: Helper Methods for Chain Analysis

Add these helper methods to assist with query chain validation:

```typescript
/**
 * Extract method names from a call expression chain
 * E.g., storage.query(...).where(...).whereIn(...).select(...)
 * Returns: ['query', 'where', 'whereIn', 'select']
 */
private extractMethodChain(node: ts.CallExpression): string[] {
  const chain: string[] = []
  let current: ts.Expression | undefined = node.expression
  
  while (current) {
    if (ts.isPropertyAccessExpression(current)) {
      chain.unshift(current.name.text)
      current = current.expression
    } else if (ts.isCallExpression(current)) {
      current = current.expression
    } else if (ts.isIdentifier(current)) {
      break
    } else {
      break
    }
  }
  
  return chain
}

/**
 * Validate that .whereIn() appears in correct position
 * Must appear before: select, execute, etc.
 * Can appear after: query, where, etc.
 */
private isValidWhereInPosition(
  methodChain: string[],
  whereInIndex: number
): boolean {
  // Methods that must come AFTER .whereIn()
  const methodsMustComeAfter = ['select', 'execute', 'limit', 'offset']
  
  // Methods that must come BEFORE .whereIn()
  const methodsMustComeBefore: string[] = []
  
  // Check methods after whereIn
  for (let i = whereInIndex + 1; i < methodChain.length; i++) {
    if (methodsMustComeBefore.includes(methodChain[i])) {
      return false // Found a method that should come before
    }
  }
  
  // Check methods before whereIn
  for (let i = 0; i < whereInIndex; i++) {
    if (methodsMustComeAfter.includes(methodChain[i])) {
      return false // Found a method that should come after
    }
  }
  
  return true
}

/**
 * Check if a source file imports from a specific module
 */
private async checkImport(sourceFile: ts.SourceFile, moduleName: string): Promise<boolean> {
  let hasImport = false
  
  this.visitNode(sourceFile, node => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpec = node.moduleSpecifier
      if (ts.isStringLiteral(moduleSpec)) {
        if (moduleSpec.text === moduleName) {
          hasImport = true
        }
      }
    }
  })
  
  return hasImport
}
```

### Step 5: Call Method from validateModule

**File:** graphql-ast-validator.ts, method `validateModule()` (line 177-244)

**Current code:**
```typescript
private async validateModule(moduleName: string, files: string[]) {
  // ... file categorization code ...
  
  // Run validation rules
  if (this.rules.checkModelFiles) {
    await this.validateModelFiles(moduleName, moduleFiles.models, files)
  }
  
  if (this.rules.checkEntityFiles) {
    await this.validateEntityFiles(moduleName, moduleFiles.entities, moduleFiles.models)
  }
  
  // ... more rules ...
  
  if (this.rules.checkResolverEndpoints) {
    await this.validateResolverEndpoints(moduleName, moduleFiles.resolvers, files)
  }
}
```

**Add this code:**
```typescript
if (this.rules.checkHgraphStorage) {
  await this.validateHgraphStorageChains(moduleName, files)
}
```

### Step 6: Add Tests

**File:** graphql-ast-validator.spec.ts

**Test Pattern:**

```typescript
describe('@hgraph/storage Query Chain Validation', () => {
  it('should pass when .whereIn() is before .select()', async () => {
    const mockFiles = ['src/user/user.service.ts']

    ;(glob as jest.Mock).mockResolvedValue(mockFiles)
    ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
      const path = filePath.toString()
      if (path.includes('user.service.ts')) {
        return Promise.resolve(`
          import { Storage } from '@hgraph/storage'
          
          @Injectable()
          export class UserService {
            async getUsers(storage: Storage) {
              return await storage
                .query(User)
                .whereIn('role', ['admin'])
                .select('id', 'name')
                .execute()
            }
          }
        `)
      }
      return Promise.resolve('')
    })

    const result = await validator.validate()

    expect(result.errors.filter(e => e.rule === 'wherein-positioning')).toHaveLength(0)
  })

  it('should fail when .whereIn() is after .select()', async () => {
    const mockFiles = ['src/user/user.service.ts']

    ;(glob as jest.Mock).mockResolvedValue(mockFiles)
    ;(fs.promises.readFile as jest.Mock).mockImplementation(filePath => {
      const path = filePath.toString()
      if (path.includes('user.service.ts')) {
        return Promise.resolve(`
          import { Storage } from '@hgraph/storage'
          
          @Injectable()
          export class UserService {
            async getUsers(storage: Storage) {
              return await storage
                .query(User)
                .select('id', 'name')
                .whereIn('role', ['admin'])  // WRONG: should be before select
                .execute()
            }
          }
        `)
      }
      return Promise.resolve('')
    })

    const result = await validator.validate()

    const whereInError = result.errors.find(e => e.rule === 'wherein-positioning')
    expect(whereInError).toBeDefined()
    expect(whereInError?.message).toContain('whereIn')
  })

  it('should handle nested query builders', async () => {
    // Test for complex scenarios
  })

  it('should ignore files without storage imports', async () => {
    // Test that non-storage files are not validated
  })
})
```

### Step 7: Update ValidationRules Enabling

The rule is already enabled in `graphql-validate-command.ts` (line 60):

```typescript
const rules: ValidationRules = {
  checkInputFiles: true,
  checkResponseFiles: true,
  checkModelFiles: true,
  checkModuleNaming: true,
  checkResolverFiles: true,
  checkServiceFiles: true,
  checkResolverEndpoints: true,
  checkHgraphStorage: true,  // Already enabled
  checkEntityFiles: true,
  checkRepositoryFiles: true,
}
```

No changes needed here.

## Implementation Considerations

### Challenge 1: Call Expression Chain Analysis

**Problem:** JavaScript/TypeScript call chains are nested structures:
```
storage.query(User).whereIn(...).select(...)
```

**In AST:** Each `.methodName()` is a CallExpression where:
- expression = PropertyAccessExpression (the `.methodName` part)
- The expression.expression = the previous call or identifier

**Solution:** Walk the expression chain backwards to extract method sequence

### Challenge 2: Method Arguments

The `.whereIn()` method signature from @hgraph/storage:
```typescript
whereIn(field: string, values: any[]): QueryBuilder
```

**Validation:** May need to check argument types, but positioning is independent

### Challenge 3: Different Query Builders

May have multiple builder types:
- Storage query builders
- Other similar chains

**Solution:** Check for @hgraph/storage import to scope validation

### Challenge 4: Dynamic Method Calls

```typescript
// This uses string-based method calls (harder to detect)
const builder = storage.query(User)
const field = 'role'
builder[methodName](...) // Can't validate this
```

**Solution:** Only validate direct property access expressions

## Error Message Examples

Create clear, actionable error messages:

```typescript
// Error 1: Wrong position
`.whereIn() must be called before .select() in query chains`

// Error 2: Multiple whereIn
`Multiple .whereIn() calls detected. Use array values in a single .whereIn() call instead.`

// Error 3: After execute
`.whereIn() cannot be called after .execute()`

// Best Practice
`.whereIn('fieldName', [...]) should be called immediately after .query() or .where() calls`
```

## Performance Impact

- **Import Detection:** Single traversal per file
- **Call Chain Extraction:** Only for storage imports
- **Chain Validation:** O(n) where n = number of methods in chain
- **Overall:** Minimal - only processes files with @hgraph/storage

## Testing Strategy

1. **Unit Tests:** Test helper methods independently
   - extractMethodChain()
   - isValidWhereInPosition()
   - checkImport()

2. **Integration Tests:** Test full validation flow
   - Real code with storage usage
   - Various positioning scenarios

3. **Edge Cases:**
   - Aliased imports: `import { Storage as DB } from '@hgraph/storage'`
   - Nested builders
   - Multiple queries in one file
   - No storage usage

## Documentation Update

Once implemented, update these documentation files:

1. **CLI Help Text**
   ```typescript
   // In validate command
   .description('Validate GraphQL modules and @hgraph/storage query chains')
   ```

2. **Rules Documentation**
   - Add to validation rules guide
   - Document correct and incorrect patterns

3. **Examples**
   - Add real-world examples
   - Show error messages

## Checklist for Implementation

- [ ] Implement `validateHgraphStorageChains()` method
- [ ] Implement `extractMethodChain()` helper
- [ ] Implement `isValidWhereInPosition()` helper
- [ ] Implement `checkImport()` helper
- [ ] Add method call from `validateModule()`
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Test with real project files
- [ ] Handle edge cases (aliased imports, nested, etc.)
- [ ] Create error messages
- [ ] Update documentation
- [ ] Update CLI help text
- [ ] Run full test suite
- [ ] Manual testing

## References

Related code:
- Method extraction pattern: `validateResolverArguments()` (line 807-887)
- Import detection pattern: Similar to checking decorators
- Call chain handling: Property access expression traversal
- Error reporting: `addError()` and `addWarning()` methods

## Next Actions

1. Research exact @hgraph/storage API and method ordering rules
2. Create detailed specification of valid method sequences
3. Implement helper methods for chain analysis
4. Test with sample code from the hypergraph project
5. Refine error messages based on real-world usage
