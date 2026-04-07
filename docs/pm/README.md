# Project Management

This directory contains planning artifacts (epics, features, stories). Roadmap and scope for the current push are
summarized in [MVP objective](../research/mvp_objective.md). A dedicated PM tool may replace this layout later.

## Structure

The project management is organized into three levels:

1. **Epics** (`1-epics/`): High-level initiatives that group related features together
2. **Features** (`2-features/`): Specific functionalities that group related stories together
3. **Stories** (`3-stories/`): Individual tasks or user stories that can be completed in a single sprint

Each level is organized into stages, and there are also shared working and done directories:

**Individual level stages:**
- **1-ready**: Ready to be worked on
- **2-to-refine**: Needs refinement before it can be worked on

**Shared workflow stages:**
- **4-in-progress**: Currently being worked on (shared across all levels)
- **5-done**: Completed items (shared across all levels)

## Numbering

There is a single file that tracks the last number used PBI number:

- `last_pbi_number.md`

Increment the number when creating a new PBI.

## Creating PBIs

A **PBI** (Product Backlog Item) is an epic, feature, or story. User stories often follow:

`As a <user>, I want <goal> so that <reason>.`

When adding a new PBI:

- Increment [last_pbi_number.md](last_pbi_number.md).
- Name files `{number}-{epic|feature|story}-{name}.md` (see existing files for examples).
- Use [story template](../dev/story_template.md) for stories.
- Place in the right folder (`1-ready` vs `2-to-refine` under epics, features, or stories).
- Link related epics/features/stories with markdown links.
- Default to **one full-stack story** when work spans API and web; split only for real dependency or complexity reasons
  ([iterative delivery](../dev/iterative_delivery.md)).
- Add acceptance criteria, technical requirements, and technical details **when refining**, not before.

See [User Stories (Mountain Goat Software)](https://www.mountaingoatsoftware.com/agile/user-stories) for classic story
format background.

## References

Epics reference features, and features reference stories, creating a hierarchical structure that helps organize the
work.
