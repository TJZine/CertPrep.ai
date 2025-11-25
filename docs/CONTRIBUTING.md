# Contributing to CertPrep.ai

Thank you for your interest in contributing. This guide explains how to report issues and submit changes.

## Code of Conduct

Be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. Check existing issues first.
2. Include browser/OS, steps to reproduce, expected vs actual behavior, and screenshots if helpful.

### Suggesting Features

1. Review open feature requests.
2. Describe the use case and benefits.

### Submitting Code

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Make changes following the coding standards below.
4. Add or update tests when possible.
5. Run checks: `npm run lint && npm run build`.
6. Commit with clear messages and open a Pull Request.

## Coding Standards

### TypeScript

- Strict mode, explicit return types.
- Avoid `any` unless unavoidable and documented.
- Prefer interfaces for object shapes.

### React

- Functional components with hooks.
- Named exports preferred.
- JSDoc on exported components.

### Styling

- Tailwind utility classes following the existing design.
- Mobile-first responsive layout.
- Maintain accessibility (labels, focus states, keyboard support).

### File Organization

```
src/
  components/ComponentName/
    ComponentName.tsx
    ComponentName.test.tsx (optional)
    index.ts
```

### Naming Conventions

- Components: PascalCase
- Hooks: camelCase with `use` prefix
- Utilities: camelCase
- Types: PascalCase
- Constants: SCREAMING_SNAKE_CASE

## Testing

Before submitting:

```bash
npm run lint
npm run build
```

Manual testing with `npm run dev` is encouraged.

## Commit Messages

Use conventional commits:

```
type(scope): description
```

Examples:

- `feat(quiz): add timer pause`
- `fix(results): correct score calculation`
- `docs(readme): update installation`

## Pull Request Process

1. Update documentation if needed.
2. Ensure checks pass.
3. Request review and address feedback.
4. Squash commits if requested.

## Questions

Open a discussion or issue for support. Thanks for contributing.
