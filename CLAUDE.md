# CLAUDE.md

This file provides guidance to Claude Code when working with this repository, following the VIBE (Voice/Intention-Based Engineering) architecture for new projects.

## Project Vision

[Brief description of what the project aims to accomplish]

## Implementation Approach

- **Frontend**: [Technologies, frameworks, libraries]
- **Backend**: [Technologies, frameworks, libraries]
- **Database**: [Database technologies]
- **Infrastructure**: [Deployment, CI/CD, cloud services]

## VIBE Architecture Principles

- Define high-level intentions first, let implementation details follow
- Maintain clear separation between intent interpretation and execution
- Use natural language to specify behavior, code to implement it
- Prioritize user experience over implementation complexity
- Document the mapping between natural language intents and code implementation

## Code Conventions

### Style Guidelines
- Use 2-space indentation for all files
- Follow consistent naming conventions:
  - camelCase for variables and functions
  - PascalCase for classes and interfaces
  - UPPER_SNAKE_CASE for constants
- Limit line length to 100 characters
- Use semicolons consistently
- Prefer explicit type annotations

### Best Practices
- Write pure functions whenever possible
- Avoid deeply nested code (maximum 3 levels)
- Implement error handling consistently
- Use early returns to reduce nesting
- Keep functions small and focused (< 30 lines)
- Use meaningful variable and function names

## Project Structure

```
src/
├── components/       # UI components
├── services/         # Business logic
├── models/           # Data models and interfaces
├── utils/            # Utility functions
├── hooks/            # Custom React hooks (if applicable)
├── api/              # API integration
├── assets/           # Static assets
└── styles/           # Global styles
tests/                # Tests directory
docs/                 # Documentation
```

## Development Flow

1. Begin with clear intention specification
2. Document user stories in natural language
3. Create test cases before implementation
4. Implement code that fulfills the intention
5. Verify that implementation matches intent
6. Document the mapping from intent to code

## Common Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Patterns and Examples

### Service Pattern

```typescript
// Example service pattern to follow
interface UserService {
  getUser(id: string): Promise<User>;
  createUser(userData: UserCreateDTO): Promise<User>;
  updateUser(id: string, userData: UserUpdateDTO): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

class UserServiceImpl implements UserService {
  constructor(private repository: UserRepository) {}
  
  async getUser(id: string): Promise<User> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error('Failed to get user', { error, userId: id });
      throw new ServiceError('Failed to get user', error);
    }
  }
  
  // Other methods implementation...
}
```

### Component Pattern

```tsx
// Example React component pattern to follow
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

export default Button;
```

### Error Handling Pattern

```typescript
// Example error handling pattern to follow
try {
  const result = await api.fetchData();
  return processResult(result);
} catch (error) {
  logger.error('Failed to fetch data', { error });
  
  if (error instanceof NetworkError) {
    throw new ApiError('Network error, please check your connection');
  } else if (error instanceof AuthError) {
    throw new ApiError('Authentication failed, please log in again');
  } else {
    throw new ApiError('An unexpected error occurred', error);
  }
}
```

## VIBE-Specific Guidance

When implementing features in this project:

1. Begin with the high-level intention or user story
2. Break down complex features into smaller, focused components
3. Define clear interfaces before implementation
4. Document the reasoning behind implementation choices
5. Use typed interfaces to ensure type safety
6. Follow established patterns in the codebase
7. Prioritize readability and maintainability over clever code

## Testing Strategy

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between multiple components
- **E2E Tests**: Test complete user flows
- **Test Coverage**: Aim for at least 80% code coverage

## Instructions for Research and External Resources

Claude, when you need to access external resources or research information:

1. ALWAYS FIRST add the URL temporarily to this CLAUDE.md file under "Authorized URLs"
2. Use WebFetchTool ONLY after adding the URL
3. Remove the URL from the list after completing the research
4. Never access URLs not explicitly authorized through this process

### Authorized URLs
- https://api.duckduckgo.com
- https://*