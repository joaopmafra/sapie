# Unit Testing (React) — Sapie

This document shapes how we apply **classical TDD** from [Unit Testing Strategy: Classical TDD](unit_testing_strategy.md)
to **React** code in Sapie (primarily `packages/web/`). It complements [Unit Testing — Sapie Implementation](unit_testing_sapie.md),
which today focuses on the **API** package; the **philosophy is the same**, the **boundaries and harness** differ.

---

## Alignment with classical TDD

In the classical school, a **unit is a behavior**, not a single class or file. Tests prefer **real
collaborators** inside the process and use **fakes at system boundaries** (see [Why We Prefer the Classical School](unit_testing_strategy.md#why-we-prefer-the-classical-school)).

On the **backend**, we often express that by hitting **HTTP endpoints** with a real app stack and
faking **Firebase** (emulator). On the **frontend**, the natural analogue is:

- Drive **user-visible behavior** (what appears on screen, what happens after click/type).
- Keep **React, TanStack Query, router, and context** real where practical.
- **Fake the network** (HTTP) at the edge—same role as the emulator for Firestore: a working
  stand-in for an external system, not mocks of every internal hook.

That keeps tests verifying **observable outcomes** (DOM, navigation, query cache effects visible
in UI) rather than **interaction expectations** on implementation details (mockist style).

---

## Default: page- or route-level tests

**Rule of thumb:** add tests at the **page** (or **route-level composition**) that owns the user
story—e.g. the note editor screen that loads metadata, signed URL, body, save status, and
persistence.

**Why this is the default**

- Most regressions live in **wiring**: query keys, loading and error handling, mutations,
  invalidation, and layout together—not in a single leaf component in isolation.
- Page-level tests match the classical idea of a **behavior** spanning multiple modules.
- They resist refactors that move state between hooks and components, as long as behavior is
  unchanged.

**What “page” means in practice**

- Render the same **tree** the app renders for that route (or a thin wrapper used only in tests).
- Provide a **stable test harness**: `QueryClientProvider`, router (`MemoryRouter` / `createMemoryRouter`),
  theme or other app-wide providers the page requires. Treat the harness as **fixture**, not the
  system under test.
- Assert with **Testing Library** conventions: roles, labels, accessible names—what a user can
  perceive.

---

## Fakes at the HTTP boundary

Prefer **one fake HTTP layer** over mocking `useQuery` / `useMutation` per test:

- **MSW (Mock Service Worker)** or an equivalent pattern: intercept `fetch` / XHR and return
  deterministic responses for `GET /api/content/:id`, `GET …/body`, `PUT …/body`, etc.
- Optional: shared **handlers** per scenario (happy path, 404 body, save error) so tests read as
  **Given / When / Then** on API contracts.

This mirrors the API doc’s emphasis on **fakes for external systems**; the browser’s view of the
server is that external system.

---

## Exceptions: sub-components and pure modules

**Sub-component tests** should be **uncommon**, not the default. Use them when:

- A **branch of UI** is hard to reach from the page without contrived setup, but the behavior is
  important (e.g. a rare error panel or deeply gated control).
- You need a **tight loop** on a **complex presentational** piece without dragging the full page
  harness every time—still assert observable output, not props passed to children.

**Pure logic** (debounce orchestration, save-state machine transitions, markdown key helpers) is
often best tested as **fast unit tests** on **plain functions**—no React tree. That matches the
classical approach: small, behavior-focused units at a seam, without turning every leaf into a
mockist component test. Product stories may explicitly call for tests “only where non-trivial”;
those modules are the usual target.

---

## What to avoid

- **Mocking internal hooks or child components** everywhere so the test only checks that “the
  right prop was passed”—that drifts toward the mockist school and breaks on harmless refactors.
- **Shallow rendering** as the default strategy—it cuts real integration feedback.
- **Brittle selectors** tied to CSS modules or DOM structure instead of roles and accessible names.

---

## Relation to the testing pyramid

Page-level React tests with MSW are **slower and broader** than pure function tests; pure logic
tests stay **fast**. A healthy mix:

- **Many** small tests for pure helpers and state machines where complexity warrants.
- **Fewer, high-signal** page tests for critical paths (load, empty body, save, error + retry,
  flush on navigation if specified).

E2E against a real deployed stack remains separate (see project contributing guidelines and story
scopes).

---

## See also

- [Unit Testing Strategy: Classical TDD](unit_testing_strategy.md)
- [Unit Testing — Sapie Implementation](unit_testing_sapie.md) — API / NestJS / emulator
- [DRAFT: React test component objects (UI drivers)](unit_testing_react_component_objects_draft.md)
  — encapsulating selectors and interactions; experimental; pairs with fixtures
- [Iterative development example: note editor](iterative_development_example_note_editor.md) —
  phased delivery for [Story 55](../pm/4-in-progress/55-story-note_content_editor.md), including
  where frontend tests concentrate (e.g. debounce / save-state helpers)
