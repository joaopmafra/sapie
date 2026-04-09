# SDD Tools: OpenSpec vs GitHub Spec Kit vs BMAD Method

These three tools are part of the **spec-driven development (SDD)** movement, which replaces vague “vibe coding” with
structured frameworks to guide AI in software development.

## Quick Comparison

| Feature         | **OpenSpec**                              | **GitHub Spec Kit**                     | **BMAD Method**                         |
|-----------------|-------------------------------------------|-----------------------------------------|-----------------------------------------|
| **Core Focus**  | Existing projects (*brownfield*) & speed. | New projects (*greenfield*) & rigor.    | Complex/Enterprise & team simulation.   |
| **Complexity**  | Minimalist and token-efficient.           | Moderate, based on sequential phases.   | High, uses multiple specialized agents. |
| **Structure**   | Single document ("source of truth").      | Fragmented into multiple feature files. | Heavy documentation, context sharding.  |
| **Agent Style** | Single AI assistant.                      | Single assistant (dev-managed).         | Up to 19 roles (PM, Architect, QA).     |

## Tool Deep Dive

- **OpenSpec (by Fission-AI):** The lightest and most cost-effective option for API usage. Capabilities live under
  `openspec/specs/`; changes ship as **deltas** (proposal / tasks / spec updates) so you do not rewrite the whole tree
  each time — see upstream layout. It is ideal for **agility** in **brownfield** codebases.
- **GitHub Spec Kit:** An official toolkit from GitHub that organizes work into four phases: **Specify, Plan, Tasks, and
  Implement**. It focuses on creating “executable” specs that are verified before code is generated, ensuring high
  **consistency** for small to medium **greenfield** projects.
- **BMAD Method:** *Breakthrough Method for Agile AI-Driven Development* — a heavyweight framework. It automates
  architecture planning by simulating a full agile team. It addresses long-chat context loss via **document sharding**,
  but needs a larger upfront investment.

## Which one to choose?

- Pick **OpenSpec** for fast maintenance and saving tokens on legacy codebases.
- Pick **GitHub Spec Kit** for new projects where you want a structured, native guide within the GitHub ecosystem.
- Pick **BMAD Method** for complex enterprise systems that require rigorous documentation, auditing, and multiple
  technical perspectives.
