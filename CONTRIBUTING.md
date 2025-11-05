# Contributing to Siege Clan Tracker

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and constructive
- Follow coding standards and conventions
- Test your changes thoroughly
- Document new features and changes

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/siege-clan-tracker.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Environment Variables

Copy `.env.example` to `.env` and configure:
- Supabase credentials
- API keys
- Admin secrets

### Running Locally

```bash
# Development server
npm run dev

# With Netlify functions
npm run netlify:dev
```

## Code Style Guidelines

### JavaScript/React

- Use ES6+ syntax
- Prefer functional components with hooks
- Use destructuring where appropriate
- Follow existing naming conventions

### Component Structure

```javascript
// Imports
import { useState } from 'react';
import ComponentName from './ComponentName';

// Component
export default function MyComponent({ prop1, prop2 }) {
  // Hooks
  const [state, setState] = useState(null);

  // Handlers
  const handleClick = () => {
    // ...
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### File Naming

- Components: `PascalCase.jsx`
- Utilities: `camelCase.js`
- Hooks: `useCamelCase.js`
- Pages: `PascalCase.jsx`

## Testing Requirements

- Write tests for new features
- Ensure all tests pass before submitting PR
- Test edge cases and error conditions
- Manual testing on multiple devices/browsers

## Pull Request Process

1. **Before submitting:**
   - Run tests: `npm test`
   - Check for linting errors: `npm run lint`
   - Build successfully: `npm run build`
   - Test locally with `npm run preview`

2. **PR Guidelines:**
   - Use clear, descriptive title
   - Describe changes and motivation
   - Reference related issues
   - Include screenshots for UI changes
   - Keep PRs focused (one feature/fix per PR)

3. **PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Local testing completed
- [ ] Tests added/updated
- [ ] Manual testing on multiple devices

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Closes #123
```

## Commit Message Guidelines

Use conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

### Examples:
```
feat(admin): add bulk member deletion

fix(auth): resolve login session timeout issue

docs(readme): update installation instructions
```

## Common Tasks

### Adding a New Feature

1. Create feature branch
2. Implement feature with tests
3. Update documentation
4. Submit PR with description

### Fixing a Bug

1. Create bug fix branch
2. Write test that reproduces bug
3. Fix the bug
4. Verify test passes
5. Submit PR referencing issue

### Updating Dependencies

1. Check for breaking changes
2. Update package.json
3. Test thoroughly
4. Update documentation if needed
5. Submit PR with changelog

## Code Review Process

- All PRs require review before merging
- Address review comments promptly
- Be open to feedback and suggestions
- Maintain professional communication

## Project-Specific Guidelines

### Admin Features

- Admin operations must use edge functions
- Never expose service role key
- Test with and without admin privileges
- Document security considerations

### Database Changes

- Create migration files for schema changes
- Test migrations on staging first
- Document migration purpose
- Include rollback plan

### API Changes

- Maintain backwards compatibility
- Update API documentation
- Version breaking changes
- Test with existing clients

### Performance

- Optimize images and assets
- Minimize bundle size
- Use proper caching strategies
- Test on slow connections

## Documentation

### When to Update Docs

- New features added
- API changes
- Configuration changes
- Architecture changes

### Documentation Standards

- Clear and concise
- Include code examples
- Update README if needed
- Add inline comments for complex logic

## Getting Help

- Review existing documentation
- Check open/closed issues
- Ask in GitHub Discussions
- Contact project maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Siege Clan Tracker! 🏰
