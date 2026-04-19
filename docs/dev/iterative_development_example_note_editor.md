# Iterative development example: note editor

This document describes **how we slice the frontend** for
[Story 55: Note Content Editor](../pm/5-done/55-story-note_content_editor.md) as a **concrete example** of
[iterative development](iterative_development.md) in Sapie. It ties the story’s phased
checklist to the same principles referenced there, plus [TDD baby steps](tdd_baby_steps.md) and
[simplicity (XP)](xp_simplicity_is_the_key.md).

## Why phased delivery here

An earlier **one-shot implementation** of the Story 55 frontend (metadata, signed read URL, markdown fetch, rich editor,
debounced auto-save, cache invalidation, and save status in a single pass) **did not hold up**: defects were hard to
isolate, regressions appeared across coupled concerns, and review feedback was expensive to act on. The phased plan is a
direct response: **grow a working simple system** before layering the final “car” (see Gall’s law on
[iterative_development.md](iterative_development.md)).

That does **not** mean the story’s **acceptance criteria** changed: the end state is still auto-save, MDXEditor, signed
URL loading, and the agreed save-status behavior. Phases are **ordering and risk control**, not a permanent subset of
the product.

## What “vertical slice” means for this feature

Each phase should be **demonstrable**: a person can open a note, perform the actions that phase supports, and observe
correct behavior against the API and storage, without relying on unfinished layers. We avoid “chassis only” slices
(all hooks, no UI) or “wheel only” slices (editor chrome with no persistence).

**Full-stack note:** Story 55’s backend for `GET`/`PUT …/body` is already shipped; frontend phases still integrate with
real HTTP and TanStack Query so each increment stays honest.

## Principles in practice

- **Iterative / skateboard first** — Plain `<textarea>` and explicit save before `@mdxeditor/editor` and before debounced
  auto-save.
- **Baby steps / tests** — Automated tests where behavior is non-trivial (e.g. debounce or save-state logic), not for
  every thin wrapper; see [Why automated tests matter here](#why-automated-tests-matter-here).
- **Simplicity / YAGNI** — Multi-tab conflict and optimistic locking are **not** in Story 55; they live in Story
  65 (65-story-note_body_concurrency_and_conflict_resolution.md).
- **Observable progress** — Dev-only “Seed body” (development-gated) validates the load path without auto-seeding every
  new note in production.

## Why automated tests matter here

Phased delivery stays trustworthy only if **each slice leaves a safety net** for the next. That is why Story
55 (55-story-note_content_editor.md) calls for **React unit tests in the same phase** as the
behavior they protect (not a single test pass at the end): each increment should be **small enough** that when a test
fails, you know the regression belongs to the work you just did—aligned with [TDD baby steps](tdd_baby_steps.md) and
with [iterative_development.md](iterative_development.md) (small improvements **with** automated tests so you do not
erode earlier phases while building toward the final editor).

**What that gives the team**

- **Regression guard** — load path, empty body, save, cache invalidation, and save status are easy to break when adding
  debounce, MDXEditor, or auth boundaries; tests keep earlier phases from silently failing.
- **Refactor confidence** — swapping `<textarea>` for `@mdxeditor/editor` or moving logic between hooks should **rerun
  the same specs**, not rely on a long manual smoke checklist after every edit.
- **Reviewable progress** — green tests make “this phase is done” legible to humans reviewing diffs (including
  LLM-assisted changes), not only to the author who clicked through the app once.

For **how** we write those tests (classical school, page-first, HTTP fakes), see [Unit Testing (React) — Sapie](unit_testing_react_sapie.md).
The story’s **Implementation approach (phased)** section lists per-phase **React tests** checkboxes alongside product tasks.

## Phase map (summary)

1. **Phase 0** — Query keys, content service and hooks, three-step load (metadata → signed URL → markdown), **404 as
   empty editor**, simple surface, markdown `staleTime`, OpenAPI/client alignment, **dev-only seed body** for display
   validation.
2. **Phase 1** — Explicit **Save**, `PUT` mutation, cache updates for metadata and body-related queries after save.
3. **Phase 2** — **Correctness**: continue editing and reload after save; optional **save only when dirty**.
4. **Phase 3** — **2 s debounce** auto-save, **flush on unmount** when dirty, full **save status** state machine in the
   header, targeted tests.
5. **Phase 4** — **Serialize or queue** saves when a `PUT` is already in flight (single editor; not multi-tab conflicts).
6. **Phase 5** — Invalidate query cache on **login/logout** so sessions do not leak content across users.
7. **Phase 6** — Swap the textarea for **`@mdxeditor/editor`** while **reusing** the data and save stack built above.

**Deferred:** concurrency across surfaces → Story 65 (65-story-note_body_concurrency_and_conflict_resolution.md.

## Using this pattern elsewhere

When a frontend story bundles **network shape**, **cache rules**, **editor or form complexity**, and **async save
timing**, consider:

- Ordering work so **data load + persistence** work with the **simplest UI** first.
- Shipping **automated tests with each slice** so the next slice does not undo the last (see [Why automated tests matter here](#why-automated-tests-matter-here)).
- Adding **temporary dev-only affordances** only when they reduce coupling and are explicitly gated and removable.
- Splitting **policy-heavy** behavior (conflicts, locking) into a **follow-up story** so the main story can ship a
  reliable default path first.

## See also

- Story 55: Note Content Editor (55-story-note_content_editor.md — full phased checklist and
  acceptance criteria
- [Unit Testing (React) — Sapie](unit_testing_react_sapie.md)
- [DRAFT: React test component objects (UI drivers)](unit_testing_react_component_objects_draft.md)
