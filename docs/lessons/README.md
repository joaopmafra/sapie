# Lessons learned

One file per lesson. Each file is self-contained (context, problem, root cause, fix).
The README is the index — add a one-line entry when creating a new lesson.

## Index

- **2026-07-02** — [nock-async-lifecycle-and-express-preference.md](nock-async-lifecycle-and-express-preference.md)
  Nock v14 emits `ECONNREFUSED` as unhandled rejection when interceptors are removed while axios keep-alive is pending. Express fake server avoids the issue entirely — prefer it for CLI integration tests.

- **2026-07-02** — [nock-localhost-ipv6-gotcha.md](nock-localhost-ipv6-gotcha.md)
  `nock.enableNetConnect('127.0.0.1')` does not cover `localhost` (which resolves to IPv6 `::1`). Use `127.0.0.1` everywhere, or skip `disableNetConnect`.

- **2026-07-02** — [cli-rename-detection-delete-create.md](cli-rename-detection-delete-create.md)
  Push detects renamed note directories as delete+create instead of a single rename PATCH. Root cause: change detection runs creates/deletes before renames. Low severity, deferred to Phase 2.

- **2026-07-02** — [new-package-root-scripts-checklist.md](new-package-root-scripts-checklist.md)
  When adding a new package to the monorepo, 7 files must be updated (verify-all.sh, lint-all.sh, format-all.sh, verify-all-test-unit.sh, root package.json, root AGENTS.md, package AGENTS.md). Checklist included.

- File names: kebab-case, descriptive (`nock-async-lifecycle-and-express-preference.md`)
- Each file has: Date, Context, Problem, Root cause, Impact/Solution, See also
- Add new entries to the index above (newest first)
- Cross-reference related lessons with `[link](other-lesson.md)` in "See also" sections
