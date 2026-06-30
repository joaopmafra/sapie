import { HttpStatus } from '@nestjs/common';

import type { Card } from '../entities/card.entity';
import { CardControllerFixture } from './card.controller.fixture';

describe('CardController', () => {
  const fixture = new CardControllerFixture();

  beforeAll(async () => {
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.clearDatabase();
  });

  afterAll(async () => {
    await fixture.close();
  });

  it('POST /api/content/:deckId/cards creates a card with FSRS defaults', async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'My Note', root.id);
    const deck = await fixture.seedDeck(fixture.TEST_USER_ID, 'My Deck', note.id);

    const response = await fixture
      .callApiCreateCard(fixture.TEST_USER_ID, deck.id, {
        front: 'What is TDD?',
        back: 'Test-Driven Development',
      })
      .expect(HttpStatus.CREATED);

    const card = response.body as Card;
    expect(card).toHaveProperty('id');
    expect(card.front).toBe('What is TDD?');
    expect(card.back).toBe('Test-Driven Development');
    expect(card.deckId).toBe(deck.id);
    expect(card.ownerId).toBe(fixture.TEST_USER_ID);
    expect(card.interval).toBe(0);
    expect(card.repetitions).toBe(0);
    expect(card.lastResult).toBeNull();
    expect(card.lastStudied).toBeNull();
    expect(card.correctCount).toBe(0);
    expect(card.incorrectCount).toBe(0);
    expect(card.dueDate).toBeDefined();
  });

  it('GET /api/content/:deckId/cards returns all cards for a deck', async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'My Note', root.id);
    const deck = await fixture.seedDeck(fixture.TEST_USER_ID, 'My Deck', note.id);

    await fixture
      .callApiCreateCard(fixture.TEST_USER_ID, deck.id, { front: 'Q1', back: 'A1' })
      .expect(HttpStatus.CREATED);
    await fixture
      .callApiCreateCard(fixture.TEST_USER_ID, deck.id, { front: 'Q2', back: 'A2' })
      .expect(HttpStatus.CREATED);

    const response = await fixture
      .callApiGetCards(fixture.TEST_USER_ID, deck.id)
      .expect(HttpStatus.OK);

    const cards = response.body as Card[];
    expect(cards).toHaveLength(2);
  });

  it('PATCH /api/content/:deckId/cards/:cardId updates front and back', async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'My Note', root.id);
    const deck = await fixture.seedDeck(fixture.TEST_USER_ID, 'My Deck', note.id);

    const createResponse = await fixture
      .callApiCreateCard(fixture.TEST_USER_ID, deck.id, {
        front: 'Old front',
        back: 'Old back',
      })
      .expect(HttpStatus.CREATED);
    const cardId = (createResponse.body as Card).id;

    const updateResponse = await fixture
      .callApiUpdateCard(fixture.TEST_USER_ID, deck.id, cardId, {
        front: 'New front',
        back: 'New back',
      })
      .expect(HttpStatus.OK);

    const updated = updateResponse.body as Card;
    expect(updated.front).toBe('New front');
    expect(updated.back).toBe('New back');
    expect(updated.id).toBe(cardId);
  });

  it('DELETE /api/content/:deckId/cards/:cardId soft-deletes card', async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'My Note', root.id);
    const deck = await fixture.seedDeck(fixture.TEST_USER_ID, 'My Deck', note.id);

    const createResponse = await fixture
      .callApiCreateCard(fixture.TEST_USER_ID, deck.id, { front: 'Q', back: 'A' })
      .expect(HttpStatus.CREATED);
    const cardId = (createResponse.body as Card).id;

    await fixture
      .callApiDeleteCard(fixture.TEST_USER_ID, deck.id, cardId)
      .expect(HttpStatus.NO_CONTENT);

    const response = await fixture
      .callApiGetCards(fixture.TEST_USER_ID, deck.id)
      .expect(HttpStatus.OK);

    const cards = response.body as Card[];
    expect(cards).toHaveLength(0);
  });

  it('POST /api/content/:deckId/cards returns 404 when deck does not exist', async () => {
    await fixture
      .callApiCreateCard(fixture.TEST_USER_ID, 'nonexistent-deck-id', {
        front: 'Q',
        back: 'A',
      })
      .expect(HttpStatus.NOT_FOUND);
  });

  it('POST /api/content/:deckId/cards returns 403 when not the deck owner', async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'My Note', root.id);
    const deck = await fixture.seedDeck(fixture.TEST_USER_ID, 'My Deck', note.id);

    await fixture
      .callApiCreateCard(fixture.OTHER_USER_ID, deck.id, { front: 'Q', back: 'A' })
      .expect(HttpStatus.FORBIDDEN);
  });

  it('POST /api/content/:deckId/cards returns 400 when parent is not a deck', async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'My Note', root.id);

    await fixture
      .callApiCreateCard(fixture.TEST_USER_ID, note.id, { front: 'Q', back: 'A' })
      .expect(HttpStatus.BAD_REQUEST);
  });
});
