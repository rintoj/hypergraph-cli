# GraphQL Validation System Documentation

This directory contains comprehensive documentation about the GraphQL validation system in the hypergraph-cli project.

## Documents

### 1. graphql-validation-architecture.md
**Main reference document** - Comprehensive overview of the entire validation system

Covers:
- System architecture and components
- Validation flow (2-pass system)
- All 14+ validation rules with implementation details
- AST analysis approach
- Error reporting mechanism
- File categorization logic
- Module detection strategy
- Testing architecture
- Design patterns and principles
- Next steps for .whereIn() validation

**Key Sections:**
- Overview of validation system
- Entry point (CLI command)
- Main validator class (GraphQLASTValidator)
- Interfaces (ValidationResult, ValidationError, ValidationRules)
- Current @hgraph/storage integration status
- Architecture for adding new rules (5-step process)

### 2. validation-rules-guide.md
**Detailed rules reference** - Deep dive into each validation rule

Organized by category:
- File Location Rules (4 rules)
- File Existence Rules (2 rules)
- File Naming Rules (2 rules)
- Class Structure Rules (3 rules)
- GraphQL Operation Rules (3 rules)
- Unimplemented Rules (2 rules)

**For each rule:**
- Rule ID and severity
- Method that implements it
- Line numbers in source code
- Check patterns
- Detection mechanism
- Error messages

**Additional Content:**
- Validation flow diagram
- AST node types reference
- Error message structure
- Testing considerations
- Rule dependencies
- Adding new rules checklist
- Performance notes
- Known limitations

### 3. adding-wherein-validation-rule.md
**Implementation guide** - Step-by-step instructions for .whereIn() validation

Covers:
- Current status (defined but not implemented)
- 7-step implementation process
- Helper methods (extractMethodChain, isValidWhereInPosition, checkImport)
- Call expression chain analysis
- Test patterns and examples
- Implementation considerations (4 main challenges)
- Performance impact analysis
- Testing strategy
- Documentation updates needed
- Complete implementation checklist

## Quick Navigation

### I want to understand the validation system
Start with: **graphql-validation-architecture.md**

### I want to know about a specific rule
Start with: **validation-rules-guide.md**

### I want to add the .whereIn() validation rule
Start with: **adding-wherein-validation-rule.md**

### I want to add a different validation rule
1. Read graphql-validation-architecture.md (Section: Architecture for Adding New Validation Rules)
2. Use validation-rules-guide.md as pattern reference
3. Follow the 5-step checklist in graphql-validation-architecture.md

## File Structure

```
src/commands/graphql/validate/
├── graphql-validate-command.ts        # CLI command entry point
├── graphql-ast-validator.ts           # Main validator class (1043 lines)
└── graphql-ast-validator.spec.ts      # Test suite (1127 lines)
```

## Key Concepts

### 1. Two-Pass Validation
1. **Pass 1:** Collect resolver field information (line 100-104)
2. **Pass 2:** Validate each module using collected information

### 2. Module-Centric Architecture
- All files grouped by module
- Module name extracted from path patterns
- Validation organized by module

### 3. AST-Based Analysis
- Uses TypeScript compiler API
- Real parsing, not regex-based
- Supports decorators, imports, call chains

### 4. Rule-Driven System
- Each rule is a boolean flag in ValidationRules
- Each rule can be independently enabled/disabled
- No inter-rule dependencies

### 5. Context-Rich Errors
- File path and line number
- Human-readable rule ID
- Detailed message with suggestions
- Code snippet with context (3 lines)

## Current Implementation Status

### Implemented Rules (14)
- input-location
- response-location
- model-location
- entity-file-not-allowed
- resolver-class
- service-class
- module-naming
- module-path
- missing-module
- missing-column-decorator
- resolver-location
- multiple-args-decorators
- event-in-resolver
- unnecessary-validation

### Not Implemented (2)
- checkHgraphStorage (defined, rule interface exists, not called)
- checkRepositoryFiles (defined, rule interface exists, not called)

## Source Code Locations

| Component | File | Lines |
|-----------|------|-------|
| CLI Command | graphql-validate-command.ts | 1-175 |
| Validator Class | graphql-ast-validator.ts | 1-1042 |
| Interfaces | graphql-ast-validator.ts | 7-35 |
| Main validate() | graphql-ast-validator.ts | 50-122 |
| Module grouping | graphql-ast-validator.ts | 124-175 |
| Input validation | graphql-ast-validator.ts | 245-306 |
| Model validation | graphql-ast-validator.ts | 308-399 |
| Entity validation | graphql-ast-validator.ts | 401-519 |
| Resolver validation | graphql-ast-validator.ts | 630-678 |
| Service validation | graphql-ast-validator.ts | 680-710 |
| Module naming | graphql-ast-validator.ts | 712-754 |
| Endpoints validation | graphql-ast-validator.ts | 756-920 |
| Helper methods | graphql-ast-validator.ts | 922-1041 |

## Running Validation

```bash
# Current working directory
hypergraph graphql validate

# Specific directory
hypergraph graphql validate --path ./src

# Strict mode (warnings as errors)
hypergraph graphql validate --strict

# JSON output
hypergraph graphql validate --json
```

## Adding New Rules - Summary

**Process (5 Steps):**
1. Add boolean flag to ValidationRules interface
2. Enable flag in graphql-validate-command.ts
3. Create private async validate[RuleName]() method
4. Call from validateModule() method
5. Add comprehensive tests

**Pattern to follow:**
- Look at validateResolverArguments() (line 807) as reference
- Use addError() or addWarning() for reporting
- Use visitNode() for AST traversal
- Extract line numbers with getLineNumber()

**Testing approach:**
- Unit tests for helper methods
- Integration tests for full validation
- Edge case testing
- Note: Mocked file content may not work with TypeScript program

## Key Design Decisions

1. **Why Two-Pass?** First pass collects metadata (resolver fields) that second pass needs
2. **Why AST-Based?** More accurate than regex; properly handles decorators and expressions
3. **Why Module-Centric?** Aligns with NestJS module structure; logical grouping
4. **Why Rule Flags?** Allows flexible enablement in different contexts (CI, pre-commit, IDE)
5. **Why Decorator-Heavy?** NestJS and TypeGraphQL heavily use decorators

## Performance Characteristics

- **File Discovery:** O(n) where n = total TypeScript files (uses glob)
- **AST Creation:** O(n) single pass over all files
- **Validation:** O(m) where m = number of validation rules enabled
- **Error Enrichment:** O(e) where e = number of errors found
- **Overall:** Linear time complexity, minimal memory footprint

## Related Documentation

- CLI help: `hypergraph graphql validate --help`
- GraphQL documentation: See graphql-doc-command.ts
- Project validation: Part of project health checks
- CI/CD Integration: Supports JSON output for automated pipelines

## Common Questions

**Q: Where should I add validation for @hgraph/storage?**
A: Create validateHgraphStorageChains() method, call from validateModule() when checkHgraphStorage is true. See adding-wherein-validation-rule.md.

**Q: How do I debug a validation rule?**
A: Add console.log in the validation method, run `hypergraph graphql validate`, check output.

**Q: Can I disable a rule?**
A: Yes, set the rule flag to false in ValidationRules, or when creating validator in tests.

**Q: Why are tests skipped?**
A: TypeScript program doesn't parse mocked file content properly. Requires real files.

**Q: How do I test my new rule?**
A: Create test files with good and bad patterns, use real validation instead of mocks.

## Contact & Support

For questions about:
- Validation architecture: See graphql-validation-architecture.md
- Specific rules: See validation-rules-guide.md
- .whereIn() implementation: See adding-wherein-validation-rule.md
- General improvements: Check recent commits (last 5 in main branch)
