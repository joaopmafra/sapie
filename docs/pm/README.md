# Project Management

This directory contains files for project management. It should be replaced by a proper tool for that, like Jira, in the
future.

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

## References

Epics reference features, and features reference stories, creating a hierarchical structure that helps organize the
work.
