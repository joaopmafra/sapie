# Unit Testing Strategy: Classical TDD

This document describes the unit testing philosophy adopted in this project. It is intentionally
project-agnostic — the principles apply to any object-oriented backend regardless of language or
framework.

For project-specific guidance (technology choices, infrastructure, test lifecycle), see
[Unit Testing — Sapie Implementation](unit_testing_sapie.md).

---

## Table of Contents

- [The Two Schools of TDD](#the-two-schools-of-tdd)
- [Test Double Taxonomy](#test-double-taxonomy)
- [Why We Prefer the Classical School](#why-we-prefer-the-classical-school)
- [The Fake Divergence Problem](#the-fake-divergence-problem)
- [The Testing Pyramid](#the-testing-pyramid)
- [Watch Mode and the Limits of Mockist Tests](#watch-mode-and-the-limits-of-mockist-tests)
- [Escape Hatches](#escape-hatches)
- [References](#references)

---

## The Two Schools of TDD

Test-Driven Development has two well-established schools that differ fundamentally on what
constitutes a "unit" and how dependencies should be handled in tests.

### Classical School (Detroit / Chicago)

The Classical school was established by Kent Beck through his original TDD work and the book
_Test-Driven Development: By Example_. Its key properties:

- **A unit is a behavior**, not a class or a function. A single test can exercise many classes
  and methods as long as they collectively implement a single observable behavior.
- **Real dependencies are preferred**. Where possible, tests use real collaborators — the same
  objects that production code uses.
- **Fakes replace external systems** (databases, message brokers, external APIs) — not internal
  collaborators. The fake is a working, simplified implementation of the external boundary.
- **Tests verify observable outputs** — the return value of a method, the state of an in-memory
  repository, the exception raised — not how the code arrived at that output.

### Mockist School (London)

The Mockist school was established by Steve Freeman and Nat Pryce in
_Growing Object-Oriented Software, Guided by Tests_. Its key properties:

- **A unit is a class** (or function). Every unit is tested in complete isolation.
- **All collaborators are mocked**. Dependencies are replaced by mock objects that record
  interactions.
- **Tests verify interactions** — that method X was called with argument Y, that a collaborator
  was invoked exactly once, etc.

### Comparison

| Dimension | Classical (Detroit) | Mockist (London) |
|---|---|---|
| **Unit definition** | A behavior (spans many classes) | A single class or function |
| **Dependencies** | Real or fakes | All mocked |
| **What is verified** | Observable output / state | Interactions (method calls) |
| **Refactor safety** | High — tests survive internal refactoring | Low — tests break on refactoring |
| **Bug detection** | High — fakes behave like real systems | Medium — mocks can paper over bugs |
| **Design feedback** | Emergent — tests focus on contracts | Prescriptive — tests prescribe wiring |
| **Originated with** | Kent Beck | Steve Freeman & Nat Pryce |

---

## Test Double Taxonomy

The term "mock" is widely overloaded. Gerard Meszaros' taxonomy from _xUnit Test Patterns_
provides precise definitions. Understanding the differences matters because the Classical and
Mockist schools use fundamentally different kinds of test doubles.

### Dummy

An object passed to a collaborator but never actually used. Its only purpose is to satisfy a
parameter list.

```
// A dummy user object passed to a function that doesn't use user data in this code path.
```

### Stub

An object that returns hardcoded values when queried but has no internal logic. It provides
indirect inputs to the system under test.

```
// A stub repository that always returns a fixed list of two notes, regardless of query parameters.
```

### Fake

A working, simplified implementation of a real dependency. A fake has real logic — it behaves
correctly within the constraints of its simplified design. The canonical example is an
in-memory repository that stores items in a collection instead of a database.

Fakes are the primary test double in the Classical school.

```
// An in-memory note repository that stores notes in a Map<id, Note>.
// It correctly enforces uniqueness, returns null for missing ids, and filters by parentId.
```

### Spy

An object that records the calls made to it so that assertions can be made on those interactions
after the fact. Unlike a mock, a spy does not fail a test on its own — the test code inspects
the recorded calls explicitly.

```
// A spy on an email notification service that records every "send" call
// so the test can assert that exactly one email was sent.
```

### Mock

An object pre-programmed with expectations about the calls it will receive. If the actual calls
do not match the expectations, the mock itself fails the test. Mocks verify behavior by
inspecting interactions, not outputs.

Mocks are the primary test double in the Mockist school.

```
// A mock repository pre-programmed to expect findById("123") and return a specific note.
// If findById is called with a different argument, or not called at all, the test fails.
```

### Summary Table

| Double | Has logic? | Verifies? | Primary school |
|---|---|---|---|
| Dummy | No | No | Either |
| Stub | No (hardcoded) | No | Either |
| Fake | Yes (simplified) | No | Classical |
| Spy | Records calls | Yes (via assertions) | Either |
| Mock | Records + expects | Yes (automatically) | Mockist |

---

## Why We Prefer the Classical School

### Tests Survive Refactoring

The most important property of a good test suite is that it continues to pass after a correct
internal refactoring. If you rename a method, extract a class, or change an internal interface
without changing observable behavior, no test should break.

Mockist tests break precisely because they are coupled to _how_ things are done, not _what_
the outcome is. When a test asserts that `repository.findById()` was called exactly once with
argument `"123"`, it will break the moment you rename that method, even if the feature works
perfectly. The test has become a change detector, not a behavior verifier.

Classical tests, because they verify outputs and state, are indifferent to internal
restructuring. They break when behavior breaks — which is exactly the signal tests should
provide.

### Fakes Surface Bugs That Mocks Hide

Consider a service that creates a note. Its repository dependency has a contract: "if a note
with the same name already exists in the same folder, throw a `ConflictException`."

- A **mock** is programmed to return a fixed value regardless of actual query semantics. If the
  programmer programs the mock incorrectly (e.g., forgetting the conflict case), the test
  passes even though the real system would throw.
- A **fake** has real logic. If the test inserts a conflicting note into the fake repository
  before calling `create()`, the fake's logic surfaces the conflict — just as the real database
  would.

Mocks test the programmer's assumptions about the system. Fakes test the system against real
behavior.

### Maintenance Cost Over Time

Mockist tests look cheap to write initially — no fake infrastructure needed, just declare a
mock and configure expectations. The cost manifests over time:

- **Interface changes require updating every mock** across all tests that use it.
- **Refactoring multiplies the cost** — touching internals breaks dozens of mock setups even
  when no behavior changed.
- **TypeScript/compiler helps with fakes** — when an interface changes, the compiler forces you
  to update the fake's implementation in one place, and all tests that use it continue to pass.

Rough cost model for 100 tests over a typical codebase lifetime:

| | Mockist | Classical |
|---|---|---|
| Writing tests | ~500 min (5 min each) | ~260 min (60 min fake + 2 min each) |
| Post-refactor repair | ~200 min (20 tests × 10 min) | 0 min |
| **Total** | **~700 min** | **~260 min** |

The upfront investment in a well-built fake pays for itself within the first major refactoring.

### Where Mocks Are Still Appropriate

The Classical school is not dogmatic. There are cases where mocks (or spies) are the right tool:

- **Verifying side effects that have no observable return value.** If your service sends an email
  via a notification adapter, the only way to assert the email was sent is to spy or mock the
  adapter. No state change is visible.
- **External dependencies with no meaningful fake.** If the only way to fake a payment gateway
  is to replicate its entire state machine, a well-configured mock may be more pragmatic.
- **Testing the boundary adapter itself.** When testing the adapter that wraps an external API,
  you may want to verify that specific HTTP calls are made with correct parameters.

The key principle: prefer fakes for _collaborators that maintain state_; consider mocks or spies
for _collaborators that trigger side effects_.

---

## The Fake Divergence Problem

The most common objection to the Classical school is: "How do we guarantee that the fake behaves
exactly like the real dependency? They will drift apart over time."

This concern is valid and has a concrete answer: **contract tests**.

### Contract Tests

A contract test is a shared test suite that defines the _behavioral contract_ of an interface.
The same test suite is run against both the real implementation and the fake.

```
// Conceptual structure:

function testNoteRepositoryContract(createRepo: () => NoteRepository) {
  it('returns null when note does not exist', ...)
  it('finds notes by parentId', ...)
  it('throws ConflictException on duplicate name within parent', ...)
}

// Run against the fake:
testNoteRepositoryContract(() => new InMemoryNoteRepository())

// Run against the real implementation (in a slower integration test suite):
testNoteRepositoryContract(() => new FirestoreNoteRepository(realDb))
```

If someone changes the real repository's behavior, the contract test fails for the real
implementation. To fix it, they must update the contract, which will then likely break the fake
— forcing the fake to be updated in lockstep.

Contract tests also act as living documentation of the repository's expected behavior.

### The TypeScript Advantage

When a repository interface gains a new method, TypeScript forces the fake (which implements
the interface) to implement the new method before the code compiles. Unlike mocks, fakes cannot
silently diverge when the interface changes.

---

## The Testing Pyramid

The Testing Pyramid is the established model for balancing test coverage, confidence, and
execution speed.

```
            /|\
           / | \            E2E Tests
          /  |  \           Tests complete user journeys through the UI
         /   |   \          Slowest · Most fragile · Fewest
        /---------\
       /     |     \        Integration Tests
      /      |      \       Tests interactions between real system components
     /       |       \      Moderate speed · Some fragility · Moderate count
    /-----------------\
   /         |         \    Unit Tests
  /          |          \   Tests behaviors via fakes for external dependencies
 /           |           \  Fast · Reliable · Many
/-------------------------\
```

### Layer Definitions

**Unit Tests** (base, ~70%)

- Test a single behavior — the output or state change produced by one logical operation.
- Use fakes for external system boundaries (databases, external APIs, message brokers).
- Use real objects for internal collaborators.
- Execute in milliseconds. Hundreds can run in under a second.
- Provide the fast feedback loop essential for TDD.

**Integration Tests** (middle, ~20%)

- Test the interaction between application code and a real external system.
- Examples: a repository implementation tested against a real database, an API client tested
  against a real HTTP server.
- Verify concerns that fakes cannot — SQL dialect, database constraints, network serialization.
- Execute in seconds to minutes. Kept to a focused set.

**E2E Tests** (apex, ~10%)

- Test complete user journeys from the UI through all system layers.
- Maximum confidence, maximum fragility, maximum execution time.
- Cover only the most critical paths — the behaviors that must never regress.

### The Ice Cream Cone Anti-Pattern

The inverse of the pyramid — many slow E2E tests, few or no unit tests — is the most common
testing anti-pattern. Its symptoms:

- Test suite takes 15–30 minutes, discouraging developers from running it.
- Failures are hard to diagnose (the bug could be in any layer).
- Flakiness due to infrastructure dependencies (network, Docker, timing).
- Refactoring is painful because changing internals breaks E2E flows.

---

## Watch Mode and the Limits of Mockist Tests

Most test runners support a _watch mode_ that automatically re-runs the test suite on every file
save, providing a continuous feedback signal during development. This feature is appealing, but
its value depends entirely on what the tests are actually verifying.

### Why Watch Mode Over Mockist Tests Has Poor Signal-to-Noise Ratio

In a mockist test suite, the tests that turn red on a file save are almost exclusively the
obvious ones:

- A method was renamed and a mock expectation references the old name.
- A function's signature changed and a mock is configured with the wrong argument count.
- A class was moved and an import path broke.

These are not the bugs that need a test suite to detect. A TypeScript compiler and an IDE will
surface all of them immediately, often before the file is even saved. Watch mode over mockist
tests is largely redundant with static analysis.

The genuinely dangerous bugs — the ones that are hard to find and expensive to debug — are a
different class entirely: **silent behavioral regressions in client code**. These occur when the
implementation of a module changes its behavior, but the modules that depend on it continue
to pass their tests because they mock the changed module out.

Consider: module A changes its return value for a certain input. Module B calls A, but B's
tests mock A — so B's tests stay green regardless of what A actually does. Module C also calls
A and mocks it. The broken contract between A and its callers is completely invisible to the
mockist test suite. It will surface only in production, or in a slow E2E test, or not at all.

Watch mode running a mockist suite provides the _appearance_ of continuous safety while offering
almost none of the substance. The tests turn red on trivial, already-obvious problems and stay
green on the problems that matter.

### Why Classical Tests Change This Calculus

Classical tests, because they use real collaborators or behaviorally faithful fakes, do not have
this blind spot. When A's behavior changes, B's test — which exercises a real A or a fake that
faithfully replicates A's contract — will break. The regression is caught at the boundary where
it actually exists.

This makes classical tests genuinely worth running as a feedback signal. Every red result is
meaningful: it means a behavior broke, not that a method name changed.

### The Right Workflow for Each School

Given this analysis, the appropriate test-running workflow differs between schools:

- **Mockist tests in watch mode**: Low value. The signal is weak (only catches obvious,
  compiler-detectable issues) and the noise is high (breaks on refactoring even when behavior
  is correct). Running them continuously trains developers to ignore red output.

- **Classical tests run deliberately**: High value. Classical tests are run as a conscious
  checkpoint — after completing a meaningful unit of implementation, not between every keystroke.
  This matches how TDD was originally conceived: write a failing test, implement the behavior,
  verify the suite. The test suite is a deliberate claim, not a background alarm.

- **Classical tests in watch mode** (when fast enough): Worth doing if the tests are
  sufficiently fast — typically when using pure in-memory fakes with no I/O. If a test suite
  runs in under two seconds, watch mode provides tight feedback without the noise problems of the
  mockist approach. This only applies to the fastest subset of the classical suite.

---

## Escape Hatches

### When Fakes Are Not Enough: Real Database in a Container

Hand-written fakes for relational databases become their own maintenance burden when queries grow
complex — JOINs, aggregations, database-specific functions, implicit type coercions. A fake that
reimplements non-trivial SQL in JavaScript/TypeScript is a second codebase to maintain.

In these cases, **Testcontainers** provides a pragmatic middle ground: a real database engine
running in a Docker container with data files on an in-memory filesystem (`tmpfs`). This gives:

- **Real SQL semantics** — no divergence between fake and real behavior.
- **Near-fake speed** — `tmpfs` eliminates disk I/O, the main cost of database operations.
- **Container reuse** — the container can be kept alive between test runs, eliminating startup
  time from the feedback loop.
- **Data isolation** — clearing tables or rolling back transactions between tests is fast.

A reasonable benchmark: first run (container cold start) ~5–10 seconds; subsequent runs
(container already running) < 1 second startup, 50–200ms per test.

### In-Memory SQL Engines

An alternative to a real database container is a library that runs SQL queries against
in-memory JavaScript collections (e.g. AlaSQL, sql.js). These allow the same SQL string from
the real repository to be used in the fake, eliminating query logic duplication.

Trade-offs:

- Faster to set up than a container.
- SQL dialect differences may still exist.
- Not all database-specific features are supported.

---

## References

- Kent Beck — _Test-Driven Development: By Example_ (2002)
- Steve Freeman & Nat Pryce — _Growing Object-Oriented Software, Guided by Tests_ (2009)
- Gerard Meszaros — _xUnit Test Patterns_ (2007) — source of the test double taxonomy
- Vladimir Khorikov — _Unit Testing: Principles, Practices, and Patterns_ (2020) — the best
  modern treatment of the Classical vs. Mockist debate
- Martin Fowler — [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html)
  (2007) — definitive article distinguishing the two schools
- Martin Fowler — [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html)
- Ham Vocke — [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- The Agile Warrior - [Classical vs Mockist testing](https://agilewarrior.wordpress.com/2015/04/18/classical-vs-mockist-testing/)
