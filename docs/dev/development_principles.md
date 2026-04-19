# Development Principles

This document outlines the core development principles used throughout the Sapie project to maintain code quality,
consistency, and maintainability.

## Product and process context

- **MVP first**: The goal is a **working study tool quickly** — see [mvp_objective.md](../plans/mvp_objective.md).
  Prefer simple designs that ship over perfect architectures that do not.
- **Lean Startup**: Build–measure–learn in small iterations; validate with real use.
- **Agile (values, not Scrum-by-default)**: Favor collaboration, working software, and responding to change; use the
  PM artifacts under `docs/pm/` as lightweight planning, not a rigid process.
- **DevOps habit**: Automate verify/build scripts and keep main shippable; detailed environment notes live in research
  and package READMEs when needed.

## Core Principles

We follow these fundamental development principles throughout the codebase:

### KISS (Keep It Simple, Stupid)

_Simplicity is the ultimate sophistication_ - Leonardo Da Vinci

We follow the Simplicity principle from Extreme Programming (XP). See the [xp_simplicity_is_the_key.md](xp_simplicity_is_the_key.md) document for details.

Guidelines:
- ✅ **Prefer simple solutions** - Choose the most straightforward approach that meets requirements
- ✅ **Avoid over-engineering** - Don't add complexity for hypothetical future needs
- ✅ **Write readable code** - Code should be self-documenting and easy to understand
- ✅ **Small functions/components** - Keep functions focused on a single responsibility
- ❌ **Don't build complex abstractions** unless there's clear, immediate value

### Make it work, make it right, make it fast

- ✅ **Make it work** - Get the basic functionality working first
- ✅ **Make it right** - Clean up and improve after the feature works
- ✅ **Make it fast** - Optimize for performance when there's a proven issue

### DRY (Don't Repeat Yourself)

- ✅ **Extract common logic** - Create reusable functions, components, or utilities
- ✅ **Use consistent patterns** - Follow established patterns throughout the codebase
- ✅ **Centralize configuration** - Keep configuration in one place (environment variables, constants)
- ✅ **Share types and interfaces** - Use TypeScript types consistently across packages
- ❌ **Don't copy-paste code** - If you need the same logic twice, create a shared utility

### YAGNI (You Aren't Gonna Need It)

- ✅ **Implement only what's needed** - Build features only when they're actually required
- ✅ **Focus on current story requirements** - Don't add features not specified in the story
- ✅ **Avoid premature optimization** - Optimize only when there's a proven performance issue
- ❌ **Don't build for "future requirements"** - Wait until requirements are concrete

### Single Responsibility Principle

Sometimes, to keep the design simple, we need to relax this principle. When this happens, we should apply the higher principle of high cohesion, but the simplicity principle is more important.

Guidelines:
- ✅ **One purpose per function** - Each function should do one thing well
- ✅ **One concern per component** - React components should have a single responsibility
- ✅ **Focused modules** - Each module should have a clear, single purpose
- ✅ **Separated concerns** - Keep business logic separate from UI logic

### First make the change easy, then make the easy change

- ✅ **Refactor first** - Clean up existing code structure before adding new functionality
- ✅ **Separate concerns** - Don't mix refactoring with feature work in the same commit
- ✅ **Simplify then extend** - Make the foundation clear before building on it

*See [detailed guide](first_make_the_change_easy.md) for examples and when to apply this principle.*

### Principle of least astonishment (POLA)

People are part of the system. The design should match the user's experience, expectations, and mental models (https://en.wikipedia.org/wiki/Principle_of_least_astonishment#cite_note-SaltzerKaashoek2009-14).

- ✅ **Avoid surprising behavior** - Don't add unexpected side effects or behavior
- ✅ **Be explicit** - Be clear about what the code does and how it behaves
- ✅ **Be consistent** - Be consistent in the way the code behaves
- ✅ **Be predictable** - Be predictable in the way the code behaves

## Application in Story Implementation

### When Implementing Features

Follow the "Make it work, make it right, make it fast" approach:

1. **Make it work** - Start with the simplest solution to get basic functionality working
2. **Make it right** - Clean up and improve the code after the feature works
3. **Make it fast** - Optimize for performance only when there's a proven issue
4. **Extract reusable parts** - If you notice duplication, create shared utilities
5. **Keep functions small** - If a function is getting long, break it down

Apply "First make the change easy, then make the easy change" when working with existing code:

- If the change feels complex due to current code structure, first refactor to simplify
- Separate refactoring commits from feature implementation commits

Follow the "Principle of least astonishment" (POLA) to create intuitive user experiences:

- Make UI behavior consistent with user expectations
- Avoid unexpected side effects or surprising interactions
- Use clear, predictable naming for functions and variables

### When Writing Tests

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Keep tests simple** - Each test should verify one specific behavior
3. **Use descriptive test names** - Test names should clearly describe what's being tested
4. **Avoid testing implementation details** - Test the public interface

### When Writing Documentation

1. **Document the "why", not just the "what"** - Explain the reasoning behind decisions
2. **Keep documentation close to code** - Document complex logic inline
3. **Update docs with code changes** - Keep documentation current
4. **Use clear, simple language** - Write for developers who will maintain the code

## TypeScript-Specific Principles

### Type Safety

- ✅ **Use strict types** - Avoid `any` type unless absolutely necessary
- ✅ **Create meaningful interfaces** - Define clear contracts between components
- ✅ **Use union types** - Prefer union types over generic objects
- ✅ **Leverage type inference** - Let TypeScript infer types when possible

### Code Organization

- ✅ **Co-locate related types** - Keep types near the code that uses them
- ✅ **Use barrel exports** - Create clean public APIs for modules
- ✅ **Consistent naming** - Use consistent naming conventions for types and interfaces

## Firebase-Specific Principles

### Authentication

- ✅ **Use Firebase Auth consistently** - Don't mix authentication methods
- ✅ **Handle auth states properly** - Always handle loading, authenticated, and unauthenticated states
- ✅ **Secure by default** - Assume endpoints need authentication unless explicitly public

### Data Management

- ✅ **Use Firebase services appropriately** - Use the right Firebase service for each use case
- ✅ **Handle offline scenarios** - Consider what happens when Firebase services are unavailable
- ✅ **Optimize for Firebase** - Structure data and queries to work efficiently with Firebase

## Code Review Principles

When reviewing code (or self-reviewing):

1. **Does it work correctly?** (Make it work, make it right, make it fast)
2. **Is it simple and easy to understand?** (KISS)
3. **Does it avoid unnecessary duplication?** (DRY)
4. **Does it only implement what's needed?** (YAGNI)
5. **Does each part have a single responsibility?** (SRP)
6. **If changing existing code, was it simplified first?** (First make the change easy, then make the easy change)
7. **Does it behave as expected without surprises?** (POLA - Principle of least astonishment)
8. **Are there proper tests for the functionality, if possible?**
9. **Is the documentation updated?**

## Questions?

For questions about applying these principles:

1. **Check [Contributing guidelines](contributing_guidelines.md)** (and [AI agent guidelines](ai_agent_guidelines.md) for
   assistants) — how principles tie to workflow and verification
2. **Review existing code** - Look at how principles are applied in the current codebase
3. **Ask the team** - When in doubt about how to apply a principle in a specific situation 
