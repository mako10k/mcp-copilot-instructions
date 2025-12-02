---
category: phases
tags: [refactoring, code-quality, maintenance]
priority: medium
required: false
phases: [refactoring]
---
# Refactoring Phase Guidance

## When to Refactor vs. Rewrite

### Refactor When:
- Code works but is hard to understand or maintain
- Test coverage is adequate (>70% for critical paths)
- Changes can be made incrementally without breaking APIs
- Technical debt is localized to specific modules
- Business logic is sound but implementation is messy

### Rewrite When:
- Fundamental architecture is flawed
- Technical debt is pervasive throughout the codebase
- Test coverage is insufficient (<30%) and adding tests is harder than rewriting
- Technology stack is obsolete or unsupported
- Performance issues stem from core design decisions

## Refactoring Safety Checklist

### Before Starting:
- [ ] Ensure comprehensive test coverage for the module
- [ ] Document current behavior (including edge cases and bugs)
- [ ] Create a feature branch from main
- [ ] Identify all external dependencies and callers
- [ ] Back up current implementation if needed

### During Refactoring:
- [ ] Make one change at a time
- [ ] Run tests after each change
- [ ] Commit frequently with descriptive messages (see `conventions/git-workflow.md`)
- [ ] Keep changes focused on structure, not behavior
- [ ] Update related documentation and comments
- [ ] Monitor performance metrics if applicable

### After Completion:
- [ ] All existing tests still pass
- [ ] No new ESLint warnings introduced
- [ ] Code review by at least one team member
- [ ] Update architectural documentation if patterns changed
- [ ] Verify no performance regressions

## Test Coverage Requirements

### Minimum Coverage Before Refactoring:
- **Critical paths**: 90%+ line coverage
- **Business logic**: 80%+ line coverage
- **Utilities**: 70%+ line coverage
- **Integration points**: All major flows covered

### If Coverage Is Insufficient:
1. Add characterization tests (document current behavior)
2. Focus on high-risk areas first
3. Use code coverage tools to identify gaps
4. Consider refactoring in smaller chunks with interim testing

## Incremental Refactoring Strategies

### Extract Method
Break large functions into smaller, focused units:
```typescript
// Before
function processOrder(order: Order): void {
  // 50 lines of validation, calculation, and persistence
}

// After
function processOrder(order: Order): void {
  validateOrder(order);
  const total = calculateTotal(order);
  persistOrder(order, total);
}
```

### Extract Class
Separate responsibilities into distinct classes:
```typescript
// Before
class OrderService {
  validate() { }
  calculate() { }
  sendEmail() { }
  generatePDF() { }
}

// After
class OrderService {
  constructor(
    private validator: OrderValidator,
    private calculator: PriceCalculator,
    private notifier: NotificationService,
    private reporter: ReportGenerator
  ) { }
}
```

### Introduce Interface
Decouple dependencies for better testability:
```typescript
// Before
class UserService {
  constructor(private db: PostgresClient) { }
}

// After
interface Database {
  query(sql: string): Promise<any>;
}

class UserService {
  constructor(private db: Database) { }
}
```

### Replace Conditional with Polymorphism
Use type system instead of if/else chains:
```typescript
// Before
function calculatePrice(type: string, base: number): number {
  if (type === 'student') return base * 0.8;
  if (type === 'senior') return base * 0.7;
  return base;
}

// After
interface PricingStrategy {
  calculate(base: number): number;
}

class StandardPricing implements PricingStrategy {
  calculate(base: number) { return base; }
}

class StudentPricing implements PricingStrategy {
  calculate(base: number) { return base * 0.8; }
}
```

### Strangler Fig Pattern
Gradually replace old code with new implementation:
1. Create new implementation alongside old code
2. Route new requests to new implementation
3. Incrementally migrate existing functionality
4. Remove old implementation once fully replaced

## Common Refactoring Patterns

### Simplify Complex Conditionals
- Extract boolean expressions into well-named variables
- Use guard clauses to reduce nesting
- Replace nested if/else with early returns

### Remove Code Duplication
- Extract common logic into shared functions
- Use composition over inheritance
- Apply DRY (Don't Repeat Yourself) principle

### Improve Naming
- Use intention-revealing names
- Avoid abbreviations unless widely understood
- Make names searchable and pronounceable

### Reduce Function Parameters
- Group related parameters into objects
- Use builder pattern for complex construction
- Consider default parameters for optional values

## Refactoring Anti-Patterns to Avoid

### Big Bang Refactoring
- **Problem**: Rewriting everything at once
- **Solution**: Refactor incrementally, maintaining working code

### Refactoring Without Tests
- **Problem**: No safety net to catch regressions
- **Solution**: Add tests before refactoring (characterization tests)

### Mixing Refactoring with New Features
- **Problem**: Hard to isolate issues and review changes
- **Solution**: Separate refactoring commits from feature commits

### Premature Optimization
- **Problem**: Optimizing before measuring performance impact
- **Solution**: Profile first, optimize hot paths only

### Over-Engineering
- **Problem**: Adding unnecessary abstractions
- **Solution**: Follow YAGNI (You Aren't Gonna Need It)

## Tools and Techniques

### Automated Refactoring Tools:
- **VS Code**: Built-in rename, extract method, move symbol
- **TypeScript Compiler**: Type checking catches many refactoring errors
- **ESLint**: Auto-fix for code style consistency

### Code Quality Metrics:
- **Cyclomatic Complexity**: Aim for <10 per function
- **Code Coverage**: Monitor coverage delta during refactoring
- **Code Duplication**: Use tools to detect duplicate code blocks

### Version Control Practices:
- Use feature branches for significant refactorings
- Commit after each successful refactoring step
- Write clear commit messages describing the refactoring type
- Tag safe rollback points if needed

## Documentation Updates

### Always Update:
- Inline JSDoc comments if function signatures change
- README if public API changes
- Architecture diagrams if structural patterns change
- Migration guides if breaking changes are introduced

### Consider Updating:
- Code examples in documentation
- Tutorial walkthroughs if affected by changes
- API documentation (Swagger/OpenAPI specs)

## Quality Gates for Refactoring PRs

Before merging refactoring changes:
- [ ] All tests pass (no new failures)
- [ ] No new ESLint warnings or errors
- [ ] Code coverage maintained or improved
- [ ] Performance benchmarks show no regressions
- [ ] At least one peer review completed
- [ ] Documentation updated as needed
- [ ] No unintended behavior changes (unless explicitly documented)

## Summary

Refactoring is an essential practice for maintaining code health. Always prioritize safety through comprehensive testing, make incremental changes, and keep refactoring separate from feature development. Follow the checklist and strategies outlined above to ensure successful, low-risk refactoring efforts.

→ See `patterns/testing.md` for testing strategies to support safe refactoring.
→ See `conventions/git-workflow.md` for commit message formats during refactoring.
