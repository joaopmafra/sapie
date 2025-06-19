# Documentation Guidelines

This document outlines the documentation structure and guidelines for the Sapie project.

## Documentation Structure Philosophy

The Sapie project follows a **distributed documentation approach** where detailed information is organized by package, with the root README serving as a clean, high-level overview.

### Root README.md Principles

The root `README.md` should:

- **Stay clean and concise** - Provide only high-level project information
- **Avoid detailed implementation details** - Keep technical specifics in package documentation
- **Reference package documentation** - Use links to direct readers to detailed information
- **Focus on getting started** - Include quick start, architecture overview, and basic commands
- **Maintain consistency** - Follow a predictable structure across all sections

### Package README.md Principles

Each package's `README.md` should:

- **Contain comprehensive details** - Include all technical documentation for that package
- **Be self-contained** - Provide complete setup, usage, and troubleshooting information
- **Include examples** - Show code examples, configuration options, and usage patterns
- **Cover development workflow** - Document development, testing, and deployment specifics

## Documentation Structure

```
sapie/
├── README.md                    # High-level overview with package references
├── docs/
│   ├── documentation_guidelines.md  # This file
│   └── [other project docs]
└── packages/
    ├── web/
    │   └── README.md           # Complete web app documentation
    ├── api/
    │   └── README.md           # Complete API documentation
    └── test-e2e/
        └── README.md           # Complete E2E testing documentation
```

## Root README Template Structure

The root README should follow this structure:

1. **Project Title & Description** - Brief overview of what Sapie is
2. **Architecture** - High-level technology stack (one line per component)
3. **Quick Start** - Essential commands to get running
4. **Package Documentation** - Links to each package's detailed documentation
5. **[Feature Sections]** - Brief overview with reference to package documentation
6. **Development** - Basic development workflow
7. **Testing** - Overview with references to package testing docs
8. **Deployment** - High-level deployment information

## Feature Documentation Pattern

When documenting features in the root README, follow this pattern:

```markdown
## [Feature Name]

[Brief description of the feature and its purpose]

**Key Capabilities**: [List 2-3 main capabilities]

For detailed [feature] setup, configuration, and usage instructions, see the **[Package Name Documentation](./packages/[package]/README.md#[section])**.
```

### Example - Authentication Section

```markdown
## Authentication

Sapie includes user authentication powered by **Firebase Auth** with **FirebaseUI**.

**Features**: Email/password authentication, Google Sign-In, email verification, password reset, and session persistence.

For detailed authentication setup, configuration, and usage instructions, see the **[Web App Authentication Documentation](./packages/web/README.md#authentication)**.
```

## Package Documentation Guidelines

### Required Sections

Each package README should include:

- **Package Title & Description**
- **Features** - Comprehensive list of capabilities
- **Architecture/Structure** - Package-specific architecture
- **Setup/Installation** - Complete setup instructions
- **Development** - Development workflow and commands
- **Configuration** - All configuration options and examples
- **Usage** - Code examples and usage patterns
- **Testing** - Testing instructions and examples
- **Troubleshooting** - Common issues and solutions

### Optional Sections

Depending on the package:

- **API Reference** - For API packages
- **Component Library** - For frontend packages
- **Deployment** - Package-specific deployment instructions
- **Performance** - Performance considerations
- **Security** - Security-related information

## AI Agent Guidelines

When working with documentation as an AI agent:

### DO:
- ✅ **Keep root README clean** - Add only high-level information with package references
- ✅ **Add details to package READMEs** - Put comprehensive information in the appropriate package
- ✅ **Use consistent linking** - Link from root README to package sections using anchors
- ✅ **Maintain structure** - Follow the established section order and format
- ✅ **Update both levels** - When adding features, update both root (brief) and package (detailed) documentation

### DON'T:
- ❌ **Add detailed code examples to root README** - These belong in package documentation
- ❌ **Duplicate information** - Keep detailed info in packages, summaries in root
- ❌ **Create orphaned documentation** - Always link from root README to package details
- ❌ **Mix abstraction levels** - Keep root README high-level, package READMEs detailed

## Link Format Standards

### Root README to Package Documentation

```markdown
For detailed [topic] information, see the **[Package Name Documentation](./packages/[package]/README.md#[section])**.
```

### Package Documentation Cross-References

```markdown
See the [Other Package Documentation](../[other-package]/README.md#[section]) for related information.
```

## Examples

### Good Root README Entry

```markdown
## Testing

Sapie includes comprehensive testing at multiple levels.

**Testing Types**: Unit tests, integration tests, and end-to-end tests with Playwright.

For package-specific testing instructions:
- **[API Testing](./packages/api/README.md#testing)** - Backend unit and integration tests
- **[Web Testing](./packages/web/README.md#testing)** - Frontend component and integration tests  
- **[E2E Testing](./packages/test-e2e/README.md)** - Complete end-to-end test suite
```

### Poor Root README Entry (Too Detailed)

```markdown
## Testing ❌

### API Testing
Run these commands to test the API:
```bash
cd packages/api
pnpm test
pnpm test:watch
pnpm test:e2e
```

The API uses Jest with these configuration options:
- testEnvironment: 'node'
- collectCoverageFrom: ['src/**/*.ts']
[... continues with detailed configuration ...]
```

## Maintenance

- **Review regularly** - Ensure documentation stays aligned with code changes
- **Update links** - Verify all package references work correctly
- **Keep structure consistent** - Maintain the same section order across packages
- **Monitor length** - If root README grows too long, move details to packages

## Questions?

If you're unsure about where documentation should go:
- **Is it implementation-specific?** → Package README
- **Is it a quick overview or getting started?** → Root README  
- **Does it need code examples?** → Package README
- **Is it architectural or high-level?** → Root README with package reference 