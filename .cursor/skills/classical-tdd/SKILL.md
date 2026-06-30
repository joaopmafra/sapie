# Skill: Classical TDD — Sapie conventions

What "unit test" means in this project, how to write one, and what to never do.

## The one thing to remember

> **A unit is a behavior, not a class.** A test exercises the full stack (controller → service → repository → emulator) through the HTTP boundary. The Firestore emulator is a sophisticated *fake*, not an external system. These are **unit tests**, not integration tests.

If you call a controller spec an "integration test" in a commit message or PR, you're using Mockist vocabulary. This project uses Classical vocabulary. Fix it.

## What a unit test looks like

```typescript
// study.controller.spec.ts — a CLASSICAL unit test
describe('StudyController', () => {
  const fixture = new StudyControllerFixture();

  beforeAll(async () => { await fixture.init(); });
  beforeEach(async () => { await fixture.clearDatabase(); });
  afterAll(async () => { await fixture.close(); });

  it('full study flow: roots with due counts → due cards → rate → updated counts', async () => {
    // Seed through the application's own write path
    const folder = await fixture.seedFolder(userId, 'AI Engineering', root.id);
    await fixture.tagFolder(userId, folder.id, ['content-root']);
    const note = await fixture.seedNote(userId, 'Bloom Filters', folder.id);
    const deck = await fixture.seedDeck(userId, 'Data Structures', note.id);
    const card = await fixture.seedCard(userId, deck.id, 'Q?', 'A.');

    // Drive behavior through HTTP (supertest)
    const rootsRes = await fixture.callApiGetRoots(userId).expect(200);

    // Assert observable output
    expect(rootsRes.body.roots[0].dueCardCount).toBe(1);
  });
});
```

Key properties:
- **One fixture per controller** — extends `AppFixture`, uses `withFakeAuth()`, provides `seed*` helpers and `callApi*` methods
- **Seeds through the application** — never writes directly to Firestore unless testing a migration
- **Drives through HTTP** — `supertest` against the real NestJS app
- **Real services, real repositories** — never `jest.fn()` on internal providers
- **Only fakes at the boundary** — `FakeAuthGuard` replaces `AuthGuard`, Firestore emulator replaces production Firestore

## What to NEVER do

### ❌ Mockist service specs

```typescript
// NEVER do this — mockist, breaks on refactoring, duplicates controller coverage
describe('ContentService', () => {
  let service: ContentService;
  let repo: jest.Mocked<ContentRepository>;

  beforeEach(() => {
    repo = { findById: jest.fn(), ... } as any;
    service = new ContentService(repo, ...);
  });

  it('should call findById', () => {
    repo.findById.mockResolvedValue(...);
    // ...
  });
});
```

Per `docs/dev/unit_testing_sapie.md`:

> Do **not** add co-located `content.service.spec.ts`-style tests that **mock** the service's injected collaborators when the same behaviors are already covered by **controller specs**.

### ❌ jest.fn() on NestJS providers

Never mock `ContentRepository`, `ContentService`, `CardService`, or any other `@Injectable()` provider with `jest.fn()`. Replace only external boundaries (auth, database, storage).

### ❌ Direct Firestore writes in test setup

```typescript
// NEVER do this for behavior tests — bypasses application write logic
const db = app.get(FirebaseAdminService).getFirestore();
await db.collection('content').doc(id).set({ ... });
```

Exception: migration tests that verify old-format data can still be read.

### ❌ Calling these "integration tests"

Controller specs are **unit tests** in this project. "Integration" / "E2E" is reserved for Playwright browser tests against a deployed environment with no fakes.

## What the firestore emulator is

The Firebase Emulator running in Docker is a **fake** (Classical school term), not an external system. It has real Firestore semantics — query behavior, constraint enforcement, index behavior — but runs locally in a `tmpfs` container with no network latency.

From `docs/dev/unit_testing_sapie.md`:

> The Firebase Emulator is a sophisticated fake, not a real external system. Tests that use it are still unit tests by the Classical school's definition. There is no meaningful categorical distinction between a test that uses a hand-written in-memory fake and one that uses the emulator — only a difference in the fidelity and implementation complexity of the fake.

## Test fixture pattern

Every controller spec has a co-located fixture extending `AppFixture`:

```
src/<feature>/controllers/
  <feature>.controller.ts         — production code
  <feature>.controller.spec.ts    — unit tests
  <feature>.controller.fixture.ts — test harness (seed helpers, API call wrappers)
```

Fixture structure:
```typescript
export class StudyControllerFixture extends AppFixture {
  readonly API_STUDY = '/api/study';
  readonly TEST_USER_ID = 'study-test-user';
  readonly OTHER_USER_ID = 'study-test-user-2';

  async init(): Promise<void> {
    this.createTestingModuleBuilder().withFakeAuth();
    await this.buildAndInit();
  }

  // Seed helpers — call the application's own write endpoints
  async seedFolder(userId: string, name: string, parentId: string): Promise<Content> { ... }
  async seedNote(userId: string, name: string, parentId: string): Promise<Content> { ... }
  async seedDeck(userId: string, name: string, parentNoteId: string): Promise<Content> { ... }
  async seedCard(userId: string, deckId: string, front: string, back: string): Promise<Card> { ... }

  // API call wrappers — return supertest.Test for chaining
  callApiGetDueCards(userId: string, rootIds: string[]): supertest.Test { ... }
  callApiRecordStudyResult(userId: string, deckId: string, cardId: string, result: 'know' | 'dont_know'): supertest.Test { ... }
}
```

## Test naming convention

- **`*.controller.spec.ts`** — default place for Nest HTTP behavior tests
- **`*.service.spec.ts`** — use sparingly; only for pure logic with no HTTP entry point
- **Co-located** with source files in `packages/api/src/`

## When a service-only spec IS justified

Per the docs, rare cases:
- Pure logic with no sensible HTTP entry (standalone function, domain object)
- Behavior that cannot be reached through the public API without unacceptable setup
- Even then: prefer **real objects + fakes at the boundary**, not mocked repositories

## Terminology reference

| Term | Means in this project |
|------|----------------------|
| **Unit test** | Behavior verified through HTTP with emulator fakes |
| **Fake** | Working simplified implementation (Firestore emulator, FakeAuthGuard) |
| **Mock** | Almost never used; reserved for side-effect adapters |
| **Integration test / E2E** | Playwright browser tests against deployed environment |
| **Controller spec** | The primary kind of unit test (`*.controller.spec.ts`) |

## Key docs

- `docs/dev/unit_testing_strategy.md` — Classical vs Mockist schools, fake taxonomy, contract tests
- `docs/dev/unit_testing_sapie.md` — Project-specific: emulator setup, auth faking, data isolation, co-location conventions
- `docs/dev/tdd_baby_steps.md` — TDD workflow
