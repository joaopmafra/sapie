import { HttpStatus } from '@nestjs/common';
import { StudyControllerFixture } from './study.controller.fixture';

describe('StudyController', () => {
  const fixture = new StudyControllerFixture();

  beforeAll(async () => {
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.clearDatabase();
  });

  afterAll(async () => {
    await fixture.close();
  });

  // ── Integration: full study flow ─────────────────────────────

  it('end-to-end study flow: roots with due counts → due cards → rate → updated counts', async () => {
    // 1. Set up hierarchy
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    const folder = await fixture.seedFolder(fixture.TEST_USER_ID, 'AI Engineering', root.id);
    await fixture.tagFolder(fixture.TEST_USER_ID, folder.id, ['content-root']);

    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Bloom Filters', folder.id);
    const deck = await fixture.seedDeck(fixture.TEST_USER_ID, 'Data Structures', note.id);

    const card1 = await fixture.seedCard(
      fixture.TEST_USER_ID,
      deck.id,
      'What is a Bloom filter?',
      'A probabilistic data structure for set membership testing.'
    );
    const card2 = await fixture.seedCard(
      fixture.TEST_USER_ID,
      deck.id,
      'What is false positive rate?',
      'Probability that a non-member is reported as a member.'
    );

    // 2. GET /api/content/roots — verify dueCardCount reflects both new cards
    type RootsResponse = { roots: { id: string; name: string; dueCardCount: number }[] };
    const rootsRes = await fixture.callApiGetRoots(fixture.TEST_USER_ID).expect(HttpStatus.OK);
    const rootsBody = rootsRes.body as RootsResponse;

    expect(rootsBody.roots).toHaveLength(1);
    expect(rootsBody.roots[0].name).toBe('AI Engineering');
    expect(rootsBody.roots[0].dueCardCount).toBe(2);

    // 3. GET /api/study/due-cards — verify both cards returned with deck context
    type DueCard = {
      id: string;
      front: string;
      back: string;
      dueDate: string;
      interval: number;
      repetitions: number;
      deckId: string;
      deckName: string;
      noteId: string;
    };
    type DueCardsBody = { cards: DueCard[]; totalDue: number };
    const dueRes = await fixture
      .callApiGetDueCards(fixture.TEST_USER_ID, [folder.id])
      .expect(HttpStatus.OK);
    const dueBody = dueRes.body as DueCardsBody;

    expect(dueBody.cards).toHaveLength(2);
    expect(dueBody.totalDue).toBe(2);
    expect(dueBody.cards[0].deckName).toBe('Data Structures');

    // 4. Rate card1 as "know"
    // SM-2: repetitions: 0→1, interval: 2^1=2, dueDate = now + 2 days
    const knowRes = await fixture
      .callApiRecordStudyResult(fixture.TEST_USER_ID, deck.id, card1.id, 'know')
      .expect(HttpStatus.OK);

    expect(knowRes.body).toHaveProperty('repetitions', 1);
    expect(knowRes.body).toHaveProperty('interval', 2);
    expect(knowRes.body).toHaveProperty('lastResult', 'know');
    expect(knowRes.body).toHaveProperty('correctCount', 1);
    expect(knowRes.body).toHaveProperty('incorrectCount', 0);

    // 5. GET /api/content/roots — card1 due in 2 days, card2 still due now
    const rootsRes2 = await fixture.callApiGetRoots(fixture.TEST_USER_ID).expect(HttpStatus.OK);
    const rootsBody2 = rootsRes2.body as RootsResponse;
    expect(rootsBody2.roots[0].dueCardCount).toBe(1);

    // 6. Rate card2 as "dont_know" — stays due immediately
    const dontKnowRes = await fixture
      .callApiRecordStudyResult(fixture.TEST_USER_ID, deck.id, card2.id, 'dont_know')
      .expect(HttpStatus.OK);

    expect(dontKnowRes.body).toHaveProperty('repetitions', 0);
    expect(dontKnowRes.body).toHaveProperty('interval', 0);
    expect(dontKnowRes.body).toHaveProperty('lastResult', 'dont_know');
    expect(dontKnowRes.body).toHaveProperty('correctCount', 0);
    expect(dontKnowRes.body).toHaveProperty('incorrectCount', 1);

    // "dont_know" resets dueDate to now → card2 is STILL due
    const rootsRes3 = await fixture.callApiGetRoots(fixture.TEST_USER_ID).expect(HttpStatus.OK);
    const rootsBody3 = rootsRes3.body as RootsResponse;
    expect(rootsBody3.roots[0].dueCardCount).toBe(1);

    // 7. Rate card2 as "know" — now it advances
    const knowRes2 = await fixture
      .callApiRecordStudyResult(fixture.TEST_USER_ID, deck.id, card2.id, 'know')
      .expect(HttpStatus.OK);

    expect(knowRes2.body).toHaveProperty('repetitions', 1);
    expect(knowRes2.body).toHaveProperty('interval', 2);
    expect(knowRes2.body).toHaveProperty('correctCount', 1);

    // Both cards in the future → 0 due
    const rootsRes4 = await fixture.callApiGetRoots(fixture.TEST_USER_ID).expect(HttpStatus.OK);
    const rootsBody4 = rootsRes4.body as RootsResponse;
    expect(rootsBody4.roots[0].dueCardCount).toBe(0);
  });

  // ── Edge cases ───────────────────────────────────────────────

  it('GET /api/study/due-cards returns 400 when rootIds is missing', async () => {
    await fixture.callApiGetDueCards(fixture.TEST_USER_ID, []).expect(HttpStatus.BAD_REQUEST);
  });

  it('GET /api/study/due-cards returns 404 when root does not exist', async () => {
    await fixture
      .callApiGetDueCards(fixture.TEST_USER_ID, ['nonexistent-id'])
      .expect(HttpStatus.NOT_FOUND);
  });

  it('PATCH study-result returns 404 for nonexistent card', async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Note', root.id);
    const deck = await fixture.seedDeck(fixture.TEST_USER_ID, 'Deck', note.id);

    await fixture
      .callApiRecordStudyResult(fixture.TEST_USER_ID, deck.id, 'nonexistent-card', 'know')
      .expect(HttpStatus.NOT_FOUND);
  });
});
