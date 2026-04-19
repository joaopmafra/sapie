# DRAFT: React test component objects (UI drivers)

**Status: draft — experimental.** Sapie has not fully adopted this pattern yet. We intend to **try
it in real tests**, compare it with **established industry practice** (page objects, screen /
region drivers, test fixtures, component testing APIs), and **iterate** until the guidance is
proven in the repo. **Do not treat this document as final policy** until this banner is removed or
replaced with an agreed maturity level.

---

## Original prompt

If we wire the id's, classes or texts directly into our tests as a means to identify nodes and make assertions, they
will become fragile: every time we change an id, class or text the tests will break potentially in several test files.
As an alternative, I would like to propose a "component object model", similar to DOM or the Page Object pattern, but at
a higher level of abstraction (for components). The idea is to create a component object model for each component to
encapsulate the means of interacting and asserting on that component. Alongside the Test Fixture pattern (see
content.controller.fixture.ts) this will greatly simplify the tests while decreasing duplication. It's also an
application of the protected_variations.md principle. Reading code can be cheap to LLMs, but isn't for humans, and
humans need to review LLM-generated code.

## Problem

If tests repeat **raw selectors**—CSS module classes, layout-specific DOM paths, or user-visible
copy—across many files, they become **fragile**: a harmless UI or copy tweak can break **multiple
tests** and obscure whether behavior or only wiring changed. That raises cost for **humans
reviewing** changes (including LLM-assisted edits), even when machines can follow scattered strings
cheaply.

---

## Proposal: encapsulate “how we touch this UI”

Introduce a **small, stable API** per **page region or meaningful component**—a “component object”
or **UI driver** (naming is not fixed)—that:

- **Finds** elements using a single implementation of the querying strategy (roles, labels,
  accessible names where possible; `data-testid` only when necessary and **referenced from this
  layer only**).
- **Performs** repeated interactions (`type`, `click`, `clear`, keyboard shortcuts) and **waits**
  (`waitFor`, `findBy*`) in one place.
- **Asserts** recurring outcomes (“save error visible”, “editor shows placeholder”) through
  methods that read in **user-observable** terms.

**Tests** then depend on that API (`noteEditor.save()`, `noteEditor.expectLoadedBody('…')`) instead
of duplicating `screen.getBy…` chains everywhere.

This is the same structural idea as the **Page Object** pattern (and close relatives: **screen
drivers**, **page fragments**, **testing APIs** for a widget), scoped at **component or region**
granularity rather than only “full browser page.”

---

## Design fit: Protected Variations

The unstable part is **how** the UI is located and driven; the stable part is **what** the scenario
needs to express. Wrapping the first behind a narrow interface is an application of **Protected
Variations** (GRASP): see [Protected Variations](protected_variations.md).

---

## Parallel: API test fixtures

On the backend, [`ContentControllerFixture`](../../packages/api/src/content/controllers/content.controller.fixture.ts)
(and similar classes) centralize URLs, auth headers, and common `supertest` flows so specs stay
readable and **one place** updates when the HTTP surface changes shape. **UI drivers** play an
analogous role for the **DOM / Testing Library** surface: they are **fixtures for interaction**,
not a second production app.

---

## Guardrails (draft)

1. **Prefer user-centric queries inside the driver** (Testing Library: roles, names, labels). The
   driver hides *which* query, not necessarily “never use testid.”
2. **`data-testid`** is a **last resort**; if used, keep identifiers **behind the driver** (or one
   constants module consumed only by drivers) so tests do not scatter magic strings.
3. **Avoid a tiny object per leaf** unless duplication forces it. Start with a **region** or **page**
   driver; extract sub-drivers when complexity or reuse demands it.
4. **Drivers orchestrate observable behavior**—they should not reach into React internals or
   implementation-only state. Assertions should still reflect what a user or assistive technology
   can observe, consistent with [Unit Testing (React) — Sapie](unit_testing_react_sapie.md) and
   classical TDD.
5. **Pure logic** (save-state machine, debounce helpers) can stay in **fast unit tests** without a
   driver; the driver focuses on **wiring and presentation** of that behavior.

---

## Tradeoffs

- **Cost:** another layer to write and maintain. It pays off when **many tests** share the same
  surface or when **UI churn** is high; a one-off trivial screen may stay inline until duplication
  hurts.
- **Risk:** an over-large driver becomes a **god object** or duplicates the component tree. Keep
  methods **behavior-named** and split when files grow.

---

## Maturity / next steps

- Remove or soften this draft after we have **in-repo examples** and a short **retrospective** (what
  worked, what we renamed, where drivers live—e.g. `*.test-drivers.ts` colocated vs `test/` tree).
- Align naming with whichever industry term the team settles on (**driver**, **screen object**,
  **component test API**, etc.) for consistency in code and reviews.

---

## See also

- [Unit Testing (React) — Sapie](unit_testing_react_sapie.md)
- [Protected Variations](protected_variations.md)
- [Unit Testing Strategy: Classical TDD](unit_testing_strategy.md)
