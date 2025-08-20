# Coding Standards and Best Practices

## Table of Contents

1. [General Principles](#general-principles)
2. [Code Style](#code-style)
3. [JavaScript/TypeScript](#javascripttypescript)
4. [Python](#python)
5. [Database](#database)
6. [Security](#security)
7. [Testing](#testing)
8. [Documentation](#documentation)

## General Principles

### Code Quality

- Write code that is readable, maintainable, and self-documenting
- Follow the DRY principle (Don't Repeat Yourself)
- Keep functions small and focused on a single responsibility
- Use meaningful variable and function names
- Comment complex logic, not obvious code

### Performance

- Optimize for readability first, performance second
- Profile before optimizing
- Use appropriate data structures and algorithms
- Minimize database queries and API calls
- Implement caching where appropriate

### Maintainability

- Write code that others can understand and modify
- Use consistent formatting and naming conventions
- Refactor regularly to improve code structure
- Keep dependencies up to date
- Follow established patterns and conventions

## Code Style

### Naming Conventions

- **Variables**: Use camelCase for JavaScript/TypeScript, snake_case for Python
- **Constants**: Use UPPER_SNAKE_CASE
- **Functions**: Use camelCase for JavaScript/TypeScript, snake_case for Python
- **Classes**: Use PascalCase
- **Files**: Use kebab-case for file names

### Formatting

- Use consistent indentation (2 spaces for JavaScript/TypeScript, 4 for Python)
- Limit line length to 80-120 characters
- Use meaningful whitespace to improve readability
- Align related code blocks consistently

### Comments

- Write comments that explain "why", not "what"
- Use JSDoc for JavaScript/TypeScript functions
- Keep comments up to date with code changes
- Remove commented-out code before committing

## JavaScript/TypeScript

### Variable Declarations

```typescript
// Good
const API_BASE_URL = 'https://api.example.com';
let userCount = 0;
const user = { id: 1, name: 'John' };

// Bad
var apiUrl = 'https://api.example.com';
let count = 0;
const u = { id: 1, name: 'John' };
```

### Function Definitions

```typescript
// Good
function calculateTotal(items: Item[], taxRate: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + taxRate);
}

// Bad
function calc(items, rate) {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].price;
  }
  return sum * (1 + rate);
}
```

### Error Handling

```typescript
// Good
async function fetchUserData(userId: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw new Error('Unable to fetch user data');
  }
}

// Bad
async function fetchUserData(userId) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}
```

### TypeScript Best Practices

- Use strict mode (`"strict": true` in tsconfig.json)
- Define interfaces for all data structures
- Use union types and generics appropriately
- Avoid `any` type - use `unknown` instead
- Leverage utility types like `Partial<T>`, `Pick<T>`, `Omit<T>`

## Python

### Code Style

```python
# Good
def calculate_user_score(user_data: dict, weights: dict) -> float:
    """Calculate user score based on weighted criteria."""
    if not user_data or not weights:
        raise ValueError("User data and weights are required")

    total_score = 0.0
    for criterion, weight in weights.items():
        if criterion in user_data:
            total_score += user_data[criterion] * weight

    return round(total_score, 2)

# Bad
def calc_score(data, w):
    s = 0
    for k, v in w.items():
        if k in data:
            s += data[k] * v
    return s
```

### Pythonic Patterns

```python
# Good - List comprehensions
squares = [x**2 for x in range(10) if x % 2 == 0]

# Good - Dictionary comprehensions
user_names = {user.id: user.name for user in users}

# Good - Context managers
with open('file.txt', 'r') as file:
    content = file.read()

# Good - Enumerate
for index, item in enumerate(items):
    print(f"Item {index}: {item}")
```

## Database

### SQL Best Practices

```sql
-- Good - Use meaningful table and column names
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Good - Use indexes for frequently queried columns
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Good - Use prepared statements to prevent SQL injection
-- Bad - String concatenation (vulnerable to SQL injection)
```

### Query Optimization

- Use `EXPLAIN ANALYZE` to understand query performance
- Avoid `SELECT *` - specify only needed columns
- Use appropriate JOIN types (INNER, LEFT, RIGHT)
- Limit result sets with `LIMIT` and `OFFSET`
- Use database transactions for data consistency

## Security

### Input Validation

```typescript
// Good - Validate and sanitize input
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Bad - No validation
function processEmail(email: string) {
  // Directly use input without validation
  return email;
}
```

### Authentication and Authorization

- Use secure authentication methods (OAuth 2.0, JWT)
- Implement proper session management
- Use HTTPS for all communications
- Implement rate limiting to prevent abuse
- Validate user permissions for all operations

### Data Protection

- Encrypt sensitive data at rest and in transit
- Use environment variables for configuration
- Never commit secrets to version control
- Implement proper logging without exposing sensitive information
- Follow the principle of least privilege

## Testing

### Unit Testing

```typescript
// Good - Comprehensive test coverage
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securepassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await userService.createUser(userData);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
      expect(result.password).not.toBe(userData.password); // Should be hashed
    });

    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'securepassword123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Invalid email format');
    });
  });
});
```

### Testing Best Practices

- Write tests before or alongside code (TDD/BDD)
- Test both happy path and edge cases
- Use descriptive test names
- Mock external dependencies
- Maintain high test coverage (>80%)
- Run tests automatically in CI/CD pipeline

## Documentation

### Code Documentation

````typescript
/**
 * Calculates the total price including tax and discounts.
 *
 * @param items - Array of items with price and quantity
 * @param taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @param discountCode - Optional discount code for additional savings
 * @returns Total price rounded to 2 decimal places
 *
 * @example
 * ```typescript
 * const items = [{ price: 10, quantity: 2 }];
 * const total = calculateTotal(items, 0.08, 'SAVE10');
 * console.log(total); // 19.44
 * ```
 */
function calculateTotal(items: Item[], taxRate: number, discountCode?: string): number {
  // Implementation...
}
````

### API Documentation

- Use OpenAPI/Swagger for REST APIs
- Document all endpoints, parameters, and responses
- Include example requests and responses
- Document error codes and messages
- Keep documentation up to date with code changes

### README Files

- Include project overview and purpose
- Document installation and setup steps
- Provide usage examples
- List dependencies and requirements
- Include contribution guidelines
- Document deployment procedures

## Code Review Guidelines

### What to Look For

- Code correctness and logic
- Security vulnerabilities
- Performance implications
- Maintainability and readability
- Test coverage
- Documentation quality

### Review Process

- Be constructive and respectful
- Focus on the code, not the person
- Suggest improvements with examples
- Approve only when satisfied
- Follow up on requested changes

## Continuous Integration

### Automated Checks

- Run tests on every commit
- Check code style and formatting
- Run security scans
- Build and deploy automatically
- Monitor code coverage trends

### Quality Gates

- All tests must pass
- Code coverage above threshold
- No security vulnerabilities
- Code review approval required
- Performance benchmarks met

## Conclusion

Following these coding standards will help create:

- More maintainable and readable code
- Fewer bugs and security vulnerabilities
- Better team collaboration
- Easier onboarding for new developers
- Higher code quality overall

Remember: Good code is not just about functionality, but about maintainability, readability, and collaboration.
