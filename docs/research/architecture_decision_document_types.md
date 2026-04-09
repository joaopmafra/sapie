# Architecture and engineering document types (reference)

Short reference for **industry-common document shapes** used to capture design intent, decisions, and operations. Names
and exact templates vary by company (Google design docs, Amazon narratives, etc.); the roles below recur across teams.

## Comparison

- **ADR** (Architecture Decision Record)
    - Typical use: one decision (or one tight bundle): context, decision, consequences, status; often numbered in
      `docs/adr/`
    - Good for durable “why we chose X” after shipping?: **Yes** — usual lightweight default
- **RFC** (Request for Comments)
    - Typical use: proposal → discussion → accepted; common in large orgs and open source
    - Good for durable “why we chose X” after shipping?: **Possible**, but implies **process** and review; heavier than
      a
      post-hoc ADR
- **Design / tech spec**
    - Typical use: how we will build something; length varies from one-pager to full spec
    - Good for durable “why we chose X” after shipping?: **During** implementation; often **trimmed** into an ADR or
      archived when done
- **Architecture overview** (e.g. C4, arc42)
    - Typical use: **current** system structure — context, containers, relationships
    - Good for durable “why we chose X” after shipping?: **Complements** ADRs; diagrams and components, not always
      per-decision narrative
- **Runbook / ops guide**
    - Typical use: how to run, troubleshoot, rotate, rollback
    - Good for durable “why we chose X” after shipping?: **No** as a substitute for rationale — pairs with ADRs; holds
      commands and playbooks
- **CHANGELOG**
    - Typical use: what changed per release or deploy
    - Good for durable “why we chose X” after shipping?: **No** for architecture “why” — factual deltas, minimal
      rationale

## Notes on each type

- **ADR:** Focused on **decisions** and **trade-offs** (options considered, why rejected). Keeps history without keeping
  the full project plan. Common templates: Michael Nygard’s four sections, or **MADR** (Markdown ADR).
- **RFC:** Strong when you need **visibility and consensus** before work starts. After acceptance, the RFC may stay as
  historical record or be summarized into an ADR for the handbook.
- **Design / tech spec:** Valuable for **alignment during build**; without curation it goes stale. Many teams **extract
  **
  the decision into an ADR and leave the spec in an archive or link from the ADR.
- **Architecture overview:** Answers “what exists now?” and “how do pieces talk?” Often **links** to ADRs for the
  interesting forks in the road.
- **Runbook:** Answers “what do I run when things break?” Operational detail should live here (or README / internal
  wiki), not in every ADR.
- **CHANGELOG:** Answers “what shipped when?” Use **semantic versioning** or keep-unreleased patterns as your project
  prefers; do not rely on it for architectural reasoning.

## Practical pairing

For a significant change (e.g. infrastructure or cross-cutting pattern):

1. Record **decisions and consequences** in an **ADR** (or a small set of ADRs).
2. Keep **how to run and verify** in **dev docs / README / agent guidelines** (runbook-style), with the ADR pointing
   there for operational detail.

This file is a **research reference** only; it is not wired into the canonical dev doc index until the team chooses to
link it.
