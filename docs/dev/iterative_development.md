# Iterative development

Sapie targets an **MVP as soon as practical** ([mvp_objective.md](../research/mvp_objective.md)). This page explains how to
slice work so each increment is **usable end-to-end**, not a pile of half-finished layers.

## Gall's law

> A complex system that works is invariably found to have evolved from a simple system that worked. A complex system
> designed from scratch never works and cannot be made to work. You have to start over, beginning with a working simple
> system.

— [John Gall](https://en.wikipedia.org/wiki/John_Gall_(author)) ([Portuguese](https://pt.wikipedia.org/wiki/John_Gall))

**In short:** a working complex system grows from a **working simple** system. A “big design up front” complex system
does not work and cannot be patched into working; you restart from something small that actually runs.

## Visual: skateboard, not a wheel (Henrik Kniberg)

The diagram contrasts **incremental but unusable** slices (a wheel, then two wheels…) with **vertical slices that solve
part of the real need** (skateboard → scooter → bicycle → …). Each step should be something you can **put in front of a
user** and learn from—even if it is not the final “car.”

![Wrong: parts of a car vs right: skateboard to car — incremental delivery that stays usable](making-sense-of-mvp.jpg)

- [Making sense of MVP — and why I prefer Earliest Testable/Usable/Lovable](https://blog.crisp.se/2016/01/25/henrikkniberg/making-sense-of-mvp) — Henrik Kniberg, Crisp (2016). The post links to **translations** (e.g. French, Spanish, Japanese) on the same page.

## Core idea for this repo

Each iteration should deliver a **complete, functional** slice that users (or you) can benefit from — even if it is simpler
than the final vision.

**Think scooter → bicycle → motorcycle → car, not chassis → wheels → engine → car.**

### The analogy

- **Wrong**: Build a chassis (unusable), then wheels (still unusable), then an engine, then finally a car.
- **Right**: Build a scooter (people can move), then a bicycle, then a motorcycle, then a car.

Each step is a whole solution to the core problem; capabilities grow over time.

### Full-stack by default

Avoid shipping an API without UI or UI without persistence unless the story explicitly calls for it. Prefer **one story**
that delivers UI + validation + persistence for the main path.

**Default**: Single story for full-stack work — complete workflow from interaction to stored data.

**Split backend vs frontend only when** there is a real reason: shared backend across clients, very uneven complexity,
parallel work by different people, or a clear dependency chain (foundation → feature). Prefer a parent feature with child
stories over orphan “backend-only” / “frontend-only” stories that don’t integrate.

### Example directions (not prescriptions)

For a note app, you might grow: simple local notes → persisted notes → accounts and sync → richer editing and study
features — each stage **working**, not a folder full of unused schema.

When **writing** stories: break big features into iterations, prioritize the smallest version that solves the problem,
know how today’s slice leads to tomorrow’s, and record how the piece fits the roadmap.

**Remember**: A working scooter today beats a promised car next month.

## See also

- [Contributing guidelines](contributing_guidelines.md) — workflow and quality checks
- [Development principles](development_principles.md) — KISS, YAGNI, POLA
