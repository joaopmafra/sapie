# Contributing Guidelines

Welcome to the Sapie knowledge management app! This document provides contribution workflow guidelines for developers and AI agents.

## Table of Contents

- [Quick Start for Contributors](#quick-start-for-contributors)
- [Story-Driven Workflow](#story-driven-workflow)
- [Development Process](#development-process)
- [Quality Standards](#quality-standards)
- [AI Agent Guidelines](#ai-agent-guidelines)
- [Communication & Collaboration](#communication--collaboration)

## Quick Start for Contributors

### Prerequisites & Setup
For environment setup, prerequisites, and getting started instructions, see the **[main README](../../README.md#quick-start)**.

### First Contribution
1. **Read the project documentation**: Start with [README](../../README.md) and [documentation guidelines](documentation_guidelines.md)
2. **Understand development principles**: Review [development principles](development_principles.md) - these guide all implementation decisions
3. **Pick a story**: Choose from `docs/pm/stories/1-ready/`
4. **Follow this guide**: Use these contributing guidelines for the workflow
5. **Reference package docs**: See individual package READMEs for technical details

## Story-Driven Workflow

### Story Organization
Stories are organized in folders under `docs/pm/stories/`:
- `0-current/` - Currently being worked on
- `1-ready/` - Ready to be picked up  
- `2-backlog/` - Future work
- `3-done/` - Completed stories

### Story Lifecycle
1. **Pick a story** from `1-ready/`
2. **Move to `0-current/`** when starting work
3. **Follow the story tasks** in sequence (see [story template](story_template.md))
4. **Complete all task components**: Implementation + Tests + Documentation
5. **Verify quality** using project scripts
6. **Move to `3-done/`** when complete

### Story Creation
- ✅ Update the [last_story_number.md](../pm/stories/last_story_number.md) file with the new story number
- ✅ Use the [story template](story_template.md) for new stories
- ✅ Place in appropriate folder (`1-ready/` or `2-backlog/`)
- ✅ Include comprehensive acceptance criteria
- ✅ Break down into manageable tasks with implementation, testing, and documentation components

## Development Process

### Core Principles
- **One story at a time** - Complete fully before starting another
- **Follow task sequence** - Complete tasks in the order specified
- **Complete all components** - Implementation, tests, and documentation for each task
- **Verify before moving on** - Run quality checks before considering work complete
- **If blocked, ask for help** - If you're stuck, ask for help from the team

### Implementation Guidelines

#### DO:
- ✅ **Implement one story task at a time** - Focus prevents incomplete work
- ✅ **Follow existing patterns** - Maintain consistency with established codebase patterns
- ✅ **Write comprehensive tests** - Unit, integration, and e2e as appropriate
- ✅ **Update documentation** - Keep all docs current with changes
- ✅ **Handle errors properly** - Implement proper error handling and logging
- ✅ **Use TypeScript properly** - Fix all type errors before committing

#### DON'T:
- ❌ **Work on multiple stories simultaneously** - Leads to incomplete work
- ❌ **Skip any task components** - Implementation, tests, and documentation are all required
- ❌ **Ignore verification failures** - Fix all linting, formatting, and type errors
- ❌ **Commit broken code** - Ensure all tests pass before committing

### Technical References
For detailed technical guidelines, see:
- **[Web Package Documentation](../../packages/web/README.md)** - React, Material-UI, Firebase Auth
- **[API Package Documentation](../../packages/api/README.md)** - NestJS, Firebase Admin, testing
- **[E2E Package Documentation](../../packages/test-e2e/README.md)** - Playwright, user journey testing
- **[Documentation Guidelines](documentation_guidelines.md)** - Documentation standards and structure
- **[Development Principles](development_principles.md)** - Core development principles and their application

## Quality Standards

### Pre-Commit Verification
Always run before committing:
```bash
./scripts/verify-all.sh
```

This verifies:
- Linting compliance (ESLint)
- Code formatting (Prettier)
- TypeScript compilation
- Test execution

### Testing Requirements

**As a startup in early development stages, our priority is shipping faster.** We focus on testing only the most critical parts of the codebase rather than achieving comprehensive test coverage. This allows us to iterate quickly while maintaining quality where it matters most.

#### Critical Testing Priority

Focus testing efforts on:
- **Core user authentication flows** (login/logout/session management)
- **Data integrity operations** (create/update/delete operations)  
- **Security-sensitive endpoints** (authentication, authorization)
- **Business-critical user journeys** (main app workflows)

#### Testing Approach

When time permits and for critical functionality, write:
- **Unit tests** - DON'T CREATE UNIT TESTS UNLESS EXTREMELY NECESSARY; if you were to create a unit test, do it only for functions and components in the project's core; DON'T CREATE UNIT TESTS FOR LIBRARY INTEGRATION
- **Integration tests** for module interactions
- **E2E tests** for complete user workflows

**Story Implementation**: Most story tasks will focus on implementation and documentation. Tests should be written only for business-critical functionality or when specifically required by the story acceptance criteria.

#### Package-Level Testing

Each package must be tested separately:

```bash
# Test API package
cd packages/api && pnpm test

# Test web package (if tests exist)
cd packages/web && pnpm test

# Run e2e tests
cd packages/test-e2e && pnpm test
```

For package-specific testing details, see individual package READMEs:
- [API Testing](../../packages/api/README.md#testing)
- [Web Testing](../../packages/web/README.md#code-quality)
- [E2E Testing](../../packages/test-e2e/README.md#running-tests)

### Git Workflow
- **Commit frequently** with logical units of work
- **Use clear commit messages** with story/task references when applicable
- **Pre-commit checklist**:
  - [ ] All tests pass (`./scripts/build-test-all.sh`)
  - [ ] Quality checks pass (`./scripts/verify-all.sh`)
  - [ ] Documentation updated
  - [ ] Story requirements met

## AI Agent Guidelines

### Story Execution
- ✅ **Read the complete story** before starting any work
- ✅ **Follow task sequence exactly** - Don't skip ahead or reorder tasks; if not possible, ask for help from the team
- ✅ **Complete each task component** - Implementation, tests, and documentation
- ✅ **Verify acceptance criteria** - Check each criterion before considering task complete
- ✅ **Use parallel tool calls** when gathering information for efficiency
- ✅ **Mark the task as complete** - Once the task is complete, mark it as complete in the story

### Implementation Standards
- ✅ **Understand context first** - Read relevant existing code before making changes
- ✅ **Follow established patterns** - Maintain consistency with codebase
- ✅ **Implement comprehensive error handling** - Don't leave error cases unhandled
- ✅ **Write thorough tests, if possible** - Cover both happy path and edge cases
- ✅ **Keep documentation current** - Update all relevant documentation

### Quality Verification
- ✅ **Run lint first** - Always run `pnpm run lint` to fix code style issues before verification
- ✅ **Run verification scripts** - Always run `./scripts/verify-all.sh` before completion
- ✅ **Fix all issues** - Address linting, formatting, and type errors
- ✅ **Test thoroughly** - Ensure all tests pass and functionality works
- ✅ **Validate story completion** - Verify all acceptance criteria are met

### Communication
- ✅ **Be explicit about progress** - Clearly communicate what's being implemented
- ✅ **Explain implementation decisions** - Provide reasoning for choices made
- ✅ **Ask for clarification** - If story requirements are unclear, ask for guidance
- ✅ **Report blockers immediately** - Identify and communicate implementation obstacles

### AI Agent DON'Ts
- ❌ **Don't skip task components** - Always implement code, tests, and documentation
- ❌ **Don't ignore quality issues** - Fix all linting, formatting, and type errors
- ❌ **Don't assume requirements** - Ask for clarification if story details are unclear
- ❌ **Don't work on multiple stories** - Focus on one story at a time
- ❌ **Don't skip verification** - Always run quality checks before completion

## Communication & Collaboration

### When to Ask for Help
- **Unclear requirements** - Story acceptance criteria or technical requirements are ambiguous
- **Technical blockers** - Implementation challenges that can't be resolved independently
- **Conflicting patterns** - Existing code has conflicting approaches
- **Architecture questions** - Uncertainty about architectural decisions

### Decision Making Process
1. **Try to resolve independently** - Use existing documentation and code patterns
2. **Research in codebase** - Look for similar implementations
3. **Document the issue** - Clearly describe the problem and attempted solutions
4. **Ask for guidance** - Present the issue with context and possible solutions
5. **Update documentation** - Once resolved, update docs to help future contributors

### Reporting Issues
When reporting issues, include:
- Clear problem description
- Steps to reproduce
- Relevant code snippets
- Attempted solutions
- Suggested next steps

## Questions?

For questions about contributing:

1. **Check existing documentation**:
   - [Main README](../../README.md) - Project overview and setup
   - [Documentation Guidelines](documentation_guidelines.md) - Documentation standards
   - Package READMEs - Technical implementation details

2. **Search previous work** - Review completed stories in `3-done/` for examples

3. **Ask the team** - Reach out for guidance when documentation doesn't cover your situation

Remember: It's better to ask for clarification than to make assumptions that could lead to incorrect implementations or wasted effort.
