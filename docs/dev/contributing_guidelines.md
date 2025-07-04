# Contributing Guidelines

Welcome to the Sapie knowledge management app! This document provides contribution workflow guidelines for developers
and AI agents.

## Table of Contents

- [Quick Start for Contributors](#quick-start-for-contributors)
- [Story-Driven Workflow](#story-driven-workflow)
- [Development Process](#development-process)
- [Quality Standards](#quality-standards)
- [AI Agent Guidelines](#ai-agent-guidelines)
- [Communication & Collaboration](#communication--collaboration)

## Quick Start for Contributors

### Prerequisites & Setup

For environment setup, prerequisites, and getting started instructions, see the
**[main README](../../README.md#quick-start)**.

### First Contribution

1. **Read the project documentation**: Start with [README](../../README.md)
   and [documentation guidelines](documentation_guidelines.md)
2. **Understand development principles**: Review [development principles](development_principles.md) - these guide all
   implementation decisions
3. **Pick a story**: Choose from `docs/pm/stories/1-ready/`
4. **Follow this guide**: Use these contributing guidelines for the workflow
5. **Reference package docs**: See individual package READMEs for technical details

## Story-Driven Workflow

### PM Artifact Organization

The project management artifacts are organized in a hierarchical structure under `docs/pm/`:

- `1-epics/` - High-level business objectives
    - `1-ready/` - Epics ready for feature breakdown
    - `2-to-refine/` - Epics requiring further refinement
- `2-features/` - Feature-level requirements
    - `1-ready/` - Features ready for story breakdown
    - `2-to-refine/` - Features requiring further refinement
- `3-stories/` - Development stories (implementation units)
    - `1-ready/` - Stories ready to be picked up for development
    - `2-to-refine/` - Stories requiring further refinement
- `4-in-progress/` - Currently being worked on (any level: epics, features, or stories)
- `5-done/` - Completed work

### Story Lifecycle

1. **Pick a story** from `3-stories/1-ready/`
2. **Move to `4-in-progress/`** when starting work
3. **Follow the story tasks** in sequence (see [story template](story_template.md))
4. **Complete all task components**: Implementation + Tests + Documentation
5. **Verify quality** using project scripts
6. **Move to `5-done/`** when complete if you are not an AI Agent; if you are, ask the user to do it manually.

The same applies for epics and features.

### PBI Creation

#### Definition and format

A PBI is a Product Backlog Item and generally is a user story, feature, or epic

A user story is a short, simple description of a feature **told from the perspective of the person who desires the new
capability**, usually a user or customer of the system. User stories typically follow a simple template:

```
As a <type of user>, I want <some goal> so that <some reason>.
```

A feature is a bigger story, containing a collection of user stories that are related to a single user goal. Features
are typically more complex than user stories and have less granular requirements.

An epic is a bigger story, containing a collection of features that are related to a single user goal. Epics are
typically more complex than features and have less granular requirements.

See [User Stories](https://www.mountaingoatsoftware.com/agile/user-stories) for more information.

#### Guidelines

- ✅ Apply the iterative development approach described
  in [Iterative Development Approach](#iterative-development-approach) to break down requirements into small and
  manageable stories
- ✅ Update the [last_pbi_number.md](../pm/last_pbi_number.md) file with the new PBI number
- ✅ Name the file using the following format: `{pbi_number}-{pbi_type}-{pbi_name}.md`
    - `pbi_number` is the number of the PBI
    - `pbi_type` is the type of the PBI (epic, feature, story)
    - `pbi_name` is the name of the PBI
    - Example: `1-epic-content.md`
    - Example: `2-feature-content.md`
    - Example: `3-story-content.md`
- ✅ Use the [story template](story_template.md) for new stories
- ✅ Place in appropriate folder (`3-stories/1-ready/` or `3-stories/2-to-refine/`)
- ✅ Break down into manageable tasks with implementation, testing, and documentation components
- ✅ **Full-stack story approach**: Default to single stories for features requiring both backend and frontend work
- ✅ **Story splitting into backend and frontend stories**: Only split when there are genuine complexity or dependency
  reasons (see detailed guidelines
  in [Iterative Development Approach](#iterative-development-approach))
- ✅ **References to epics, features, and stories**: **ALWAYS** reference the epic, feature, and story that the PBI is
  related to in the form of markdown links. Example: `[#23 Epic: Content Management Foundation](../pm/1-epics/23-epic-content_management_foundation.md)`.
- ✅ **Acceptance criteria**: Only include acceptance criteria when refining a story
- ✅ **Technical Requirements**: Only include technical requirements when refining a story
- ✅ **Technical Details**: Only include technical details when refining a story

## Development Process

TODO: add the "baby steps" approach; see 31-story-implement_content_storage_foundation.md task 9 for an example of how
to do it.

### Iterative Development Approach

When building toward a complex feature or system, each iteration should deliver a complete, functional product that
provides real value to users - even if it's simpler than the final vision.

**Think scooter → bicycle → motorcycle → car, not chassis → wheels → engine → car.**

#### The Transportation Analogy

Imagine you're tasked with building a car for users who need transportation:

- ❌ **Wrong approach**: Build a chassis first (unusable), then add wheels (still unusable), then engine (still
  unusable), then finally a working car
- ✅ **Right approach**: Build a scooter first (users can move!), then upgrade to bicycle (better!), then motorcycle (
  even better!), then finally a sophisticated car

Each iteration is a complete, working solution that solves the core problem while progressively adding capabilities.

##### Full-Stack Feature Planning and Implementation

**Core principle**: Build complete, working features that users can immediately benefit from.

Just like the transportation analogy, avoid building incomplete parts (API without UI, or UI without backend). Instead,
build simple but complete end-to-end functionality that delivers real user value. This is **VERY** important to enable
fast feedback loops.

**Default approach**: Single story for full-stack features

- ✅ **Complete user workflow**: From UI interaction to data persistence
- ✅ **Immediate user value**: Feature works end-to-end upon completion
- ✅ **Faster delivery**: No coordination overhead between separate stories
- ✅ **Example**: "Add note creation" → API endpoint + UI form + validation + storage

**When to split**: Only for genuine complexity or dependency reasons

- ❌ **Don't split just because** it "feels like too much work"; in this case, it's better to split the story into
  smaller ones
- ✅ **Do split when**:
    - Backend serves multiple frontends and has standalone value
    - Significant technical complexity differences (simple UI + complex data processing)
    - Different team members must work simultaneously
    - Clear dependency chain exists (foundation → feature)
- ✅ **Structure**: Create parent feature with child stories for backend and frontend components, not isolated
  backend/frontend stories

#### Applying This to Software Features Planning and Implementation

**Example: Building a Note-Taking System**

Instead of building incomplete database schemas + incomplete UI + incomplete API:

1. **Iteration 1** (Scooter): Simple text input that saves to localStorage - users can take notes immediately
2. **Iteration 2** (Bicycle): Add basic persistence with a simple backend - notes survive browser refresh
3. **Iteration 3** (Motorcycle): Add user accounts and sync - notes available across devices
4. **Iteration 4** (Car): Add rich formatting, search, tags, and collaboration features

Another approach is to split complex features into small iterations that deliver complete functionality that users can
immediately benefit from:

1. **Iteration 1** (Scooter): Add a tree-like structure for note organization with just a root folder
2. **Iteration 2** (Bicycle): Add note editing and listing under the root folder
3. **Iteration 3** (Motorcycle): Add note deletion, nested folders, and favorites
4. **Iteration 4** (Car): Add sync, search, tags, and collaboration features

#### Story Planning and Creation

When creating stories:

- **Break complex features** into iterative releases rather than building everything at once
- **Prioritize core functionality** - what's the minimal version that solves the user's problem?
- **Plan upgrade path** - how will each iteration naturally evolve to the next?
- **Document the vision** - explain how this iteration fits into the larger roadmap

**Remember**: Users prefer a working scooter today over a promised car next month. Each iteration should make their life
better immediately.

#### Guidelines for AI Agents

- ✅ **Start with the simplest working solution** that addresses the core user need
- ✅ **Each iteration should be deployable** and provide measurable user value
- ✅ **Build end-to-end** (UI + logic + data) for each iteration, even if simple
- ✅ **Plan the progression** - know how each iteration builds toward the final vision
- ✅ **Get feedback early** - deploy iterations to validate assumptions before building more complexity

### Implementation Guidelines

#### Story Implementation

- **One story at a time** - Complete fully before starting another
- **Follow task sequence** - Complete tasks in the order specified
- **Complete all components** - Implementation, tests, and documentation for each task
- **Verify before moving on** - Run quality checks before considering work complete
- **If blocked, ask for help** - If you're stuck, ask for help from the team

#### DO:

- ✅ **Implement one story task at a time** - Focus prevents incomplete work
- ✅ **Follow existing patterns** - Maintain consistency with established codebase patterns
- ✅ ~~**Write comprehensive tests** - Unit, integration, and e2e as appropriate~~
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
- **[Firebase Integration Guide](../other/nestjs_firebase_integration.md)** - Firebase module architecture and usage
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

**As a startup in early development stages, our priority is shipping faster.** We focus on testing only the most
critical parts of the codebase rather than achieving comprehensive test coverage. This allows us to iterate quickly
while maintaining quality where it matters most.

#### Critical Testing Priority

Focus testing efforts on:

- **Core user authentication flows** (login/logout/session management)
- **Data integrity operations** (create/update/delete operations)
- **Security-sensitive endpoints** (authentication, authorization)
- **Business-critical user journeys** (main app workflows)

#### Testing Approach

When time permits and for critical functionality, write:

- **Unit tests** - DON'T CREATE UNIT TESTS UNLESS EXTREMELY NECESSARY; if you were to create a unit test, do it only for
  functions and components in the project's core; DON'T CREATE UNIT TESTS FOR LIBRARY INTEGRATION
- **Integration tests** for module interactions
- **E2E tests** for complete user workflows

**Story Implementation**: Most story tasks will focus on implementation and documentation. Tests should be written only
for business-critical functionality or when specifically required by the story acceptance criteria.

#### Test Task Marking Guidelines

**CRITICAL**: Only mark test-related tasks as complete when tests actually exist and pass.

##### When to Mark Test Tasks Complete ✅

- **Tests actually exist** - You can see the test files in the codebase
- **Tests are implemented** - The test files contain actual test cases, not just empty files
- **Tests pass** - All tests execute successfully when run
- **Test coverage matches task description** - If task says "unit tests for service X", service X has unit tests

##### When NOT to Mark Test Tasks Complete ❌

- **No test files exist** - Cannot mark "unit tests implemented" if no `.spec.ts` files exist
- **Empty test files** - Test files exist but contain no actual test cases
- **Tests fail** - Cannot mark complete if tests don't pass
- **Relying only on E2E coverage** - E2E tests don't count as unit/integration test completion
- **Planning to write tests later** - Mark as incomplete or deferred, not complete

##### Alternative Approaches for Startup Speed

If following startup-speed approach and skipping non-critical tests:

- ✅ **Mark task as "Deferred"** - `- [ ] Unit tests (deferred for startup speed)`
- ✅ **Update task description** - `- [x] Implementation complete (tests deferred)`
- ✅ **Add note in story** - Document testing decisions in story notes
- ✅ **Be honest in documentation** - Don't claim tests exist when they don't

##### Examples

**Good test task marking:**

```markdown
- [x] Unit tests for UserService - tests/user.service.spec.ts created and passing
- [x] Integration tests for auth flow - 5 test cases covering happy path and errors
- [ ] Performance tests (deferred - not critical for MVP)
```

**Bad test task marking:**

```markdown
- [x] Unit tests for UserService (covered by E2E tests)
- [x] Integration tests (will add later)
- [x] Component tests (functionality works, so marking complete)
```

**Remember**: It's better to be honest about test coverage than to claim tests exist when they don't. This helps with
future maintenance and debugging.

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
- ✅ **DO NOT mark the whole story as complete** - Once the story is complete, ask developers to verify if it really is
  and remind them to mark it once it's complete

### Implementation Standards

- ✅ **Understand context first** - Read relevant existing code before making changes
- ✅ **Follow established patterns** - Maintain consistency with codebase
- ✅ **Implement comprehensive error handling** - Don't leave error cases unhandled
- ✅ **Write thorough tests, if possible** - Cover both happy path and edge cases
- ✅ **Keep documentation current** - Update all relevant documentation

### Quality Verification

Run these scripts in sequence after completing implementation:

- ✅ **Fix formatting and linting issues** - After implementing any changes, run `./scripts/format-lint-all.sh` to
  automatically fix ESLint violations before running any other scripts
- ✅ **Verify code quality** - Run `./scripts/verify-all.sh` to ensure all quality checks pass
- ✅ **Run tests** - Run `./scripts/build-test-all.sh` to ensure all tests pass
- ✅ **Address any failures** - Fix any remaining linting, formatting, type, or test errors
- ✅ **Verify all claims made** - Use tool calls to confirm every claim about implementation
- ✅ **Validate story completion** - Verify all acceptance criteria are met

**Important**: If `verify-all.sh` or `build-test-all.sh` fail, address the specific issues reported before proceeding.

**Critical**: Before claiming any task is complete, use appropriate tools (read_file, grep_search, codebase_search) to
verify your claims are accurate.

### Communication

- ✅ **Be explicit about progress** - Clearly communicate what's being implemented
- ✅ **Explain implementation decisions** - Provide reasoning for choices made
- ✅ **Ask for clarification** - If story requirements are unclear, ask for guidance
- ✅ **Report blockers immediately** - Identify and communicate implementation obstacles

### Honesty and Verification Requirements

**CRITICAL**: AI agents must be completely honest about what has been implemented and must verify every claim before
making it.

#### Mandatory Verification Before Making Claims

Before marking ANY task as complete or making ANY claim about implementation:

- ✅ **Verify files actually exist** - Use file reading tools to confirm files are present
- ✅ **Verify code actually works** - Use search tools to confirm implementation matches claims
- ✅ **VERIFY TESTS ACTUALLY RUN AND PASS** - Use terminal commands to run tests and confirm they pass
- ✅ **Verify functionality actually works** - Don't claim something works without evidence

#### Critical Rule: NO Test Task Completion Without Running Tests

**ABSOLUTE REQUIREMENT**: Before marking ANY test-related task as complete:

1. **MUST run the actual tests** using terminal commands
2. **MUST verify tests pass** - failing tests = incomplete task
3. **MUST fix any test failures** before claiming completion
4. **MUST NOT assume tests work** based on code inspection alone

**Examples of required verification:**

```bash
# For all tests - **PREFER THIS APPROACH WHENEVER POSSIBLE**
pnpm test
# or
scripts/build-test-all.sh

# For backend unit tests
cd packages/api && pnpm test -- --testPathPattern="content.*spec.ts"

# For frontend unit tests  
cd packages/web && pnpm test -- --testPathPattern="content.*test.ts"

# For e2e tests
cd packages/test-e2e && pnpm test -- tests/content/
```

**If tests fail**: Fix the failures or mark the task as incomplete. NEVER mark test tasks complete when tests are
failing.

#### Examples of Required Verification

**Before claiming "Unit tests implemented":**

```bash
# MUST verify test files exist and contain actual tests
grep_search query="describe|it|test" include_pattern="*.spec.ts"
read_file target_file="path/to/test.spec.ts" # Confirm tests exist
```

**Before claiming "API endpoint working":**

```bash
# MUST verify endpoint exists in code
grep_search query="@Get.*root" include_pattern="*.controller.ts"
read_file target_file="path/to/controller.ts" # Confirm implementation
```

**Before claiming "E2E tests cover workflow":**

```bash
# MUST verify E2E tests actually test the claimed functionality
grep_search query="workspace|content" include_pattern="test-e2e/**/*.spec.ts"
```

#### Honesty Requirements

- ✅ **Admit when you don't know** - "I cannot verify if this works" instead of assuming
- ✅ **Admit when you haven't implemented something** - "Tests not implemented" instead of claiming they exist
- ✅ **Admit when you're making assumptions** - "Assuming this works based on..." instead of claiming certainty
- ✅ **Admit when verification failed** - "Cannot confirm tests pass" instead of marking complete

#### Consequences of Dishonesty

Dishonest claims:

- **Waste developer time** when they discover the truth later
- **Undermine trust** in AI assistance
- **Create technical debt** by hiding missing components
- **Compromise project quality** by giving false confidence

#### Red Flag Phrases to Avoid

Never use these phrases without explicit verification:

- ❌ "Tests are passing" (without running them)
- ❌ "Task 8 (testing) is complete" (without running any tests)
- ❌ "Comprehensive testing implemented" (without running tests to verify)
- ❌ "E2E coverage is complete" (without checking E2E test content)
- ❌ "Implementation is tested" (without verifying test files exist)
- ❌ "Everything works" (without evidence)
- ❌ "77+ test cases across all testing levels" (without running tests to confirm they work)

#### Required Honest Alternatives

Instead of false claims, use honest documentation:

- ✅ "Implementation complete, tests deferred for startup speed"
- ✅ "Functionality works via manual testing, automated tests not implemented"
- ✅ "Cannot verify test coverage, marking as incomplete"
- ✅ "Code compiles successfully, runtime testing pending"

**Remember**: Honesty builds trust. Dishonesty destroys it. Always verify claims before making them.

### AI Agent DON'Ts

- ❌ **Don't skip task components** - Always implement code, tests, and documentation
- ❌ **Don't ignore quality issues** - Fix all linting, formatting, and type errors
- ❌ **Don't assume requirements** - Ask for clarification if story details are unclear
- ❌ **Don't work on multiple stories** - Focus on one story at a time
- ❌ **Don't skip verification** - Always run quality checks before completion
- ❌ **Don't mark test tasks complete without actual tests** - Only mark test tasks as ✅ when test files exist and pass
- ❌ **Don't make unverified claims** - Every claim about implementation must be verified with tool calls
- ❌ **NEVER claim "Task X completed" without running the actual deliverables** - If the task is about tests, run the
  tests first
- ❌ **NEVER write a summary claiming comprehensive test coverage without verifying tests work** - File existence ≠
  working tests
- ❌ **NEVER commit code.** Stage changes and inform the user they are ready for review and commit.
- ❌ **NEVER delete files unless they are directly part of the current task.** For example, when renaming a file, it is acceptable to remove the old file. However, do not remove other, unrelated files from the project, even if they appear to be unused.

#### Common AI Agent Mistakes to Avoid

**Mistake Pattern**: Creating test files but claiming task completion without running them

- ❌ Creating `.spec.ts` files with test code
- ❌ Writing documentation about "comprehensive testing"
- ❌ Claiming "Task 8: Comprehensive Testing completed"
- ❌ **BUT**: Never actually running `npm test` to verify tests work

**Correct Approach**: Always verify before claiming

- ✅ Create test files
- ✅ Run the tests: `cd packages/api && npm test`
- ✅ Fix any failures (dependency injection issues, missing imports, etc.)
- ✅ Only then claim task completion

**If tests fail**: Be honest and say "Tests implemented but failing due to [specific issues]. Task incomplete until
fixed."

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

Remember: It's better to ask for clarification than to make assumptions that could lead to incorrect implementations or
wasted effort.
