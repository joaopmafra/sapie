import nock from 'nock';
import { ApiClient, ApiError } from '../../src/lib/api/api-client';
import { CardResponse, ContentResponse, ContentType } from '../../src/lib/api/types';

const BASE_URL = 'http://localhost:9999/api';
const TEST_TOKEN = 'test-id-token';

function makeContent(overrides: Partial<ContentResponse> = {}): ContentResponse {
  return {
    id: 'note-1',
    name: 'Test Note',
    type: ContentType.NOTE,
    parentId: 'parent-1',
    ownerId: 'owner-1',
    body: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCard(overrides: Partial<CardResponse> = {}): CardResponse {
  return {
    id: 'card-1',
    deckId: 'deck-1',
    ownerId: 'owner-1',
    front: 'Q',
    back: 'A',
    dueDate: '2024-01-01T00:00:00.000Z',
    interval: 0,
    repetitions: 0,
    lastResult: null,
    lastStudied: null,
    correctCount: 0,
    incorrectCount: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(BASE_URL);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ── Token injection ──

  describe('token injection', () => {
    it('sends Authorization header when token provider returns a token', async () => {
      client.setTokenProvider(async () => TEST_TOKEN);
      nock('http://localhost:9999', {
        reqheaders: { authorization: `Bearer ${TEST_TOKEN}` },
      })
        .get('/api/content/root')
        .reply(200, makeContent());
      await client.getRoot();
    });

    it('does not send Authorization header when no token provider is set', async () => {
      nock('http://localhost:9999')
        .matchHeader('authorization', (val) => val === undefined)
        .get('/api/content/root')
        .reply(200, makeContent());
      await client.getRoot();
    });

    it('does not send Authorization header when token provider returns null', async () => {
      client.setTokenProvider(async () => null);
      nock('http://localhost:9999')
        .matchHeader('authorization', (val) => val === undefined)
        .get('/api/content/root')
        .reply(200, makeContent());
      await client.getRoot();
    });
  });

  // ── Content endpoints ──

  describe('getRoot', () => {
    it('returns ContentResponse', async () => {
      const expected = makeContent({ id: 'root-content' });
      nock('http://localhost:9999').get('/api/content/root').reply(200, expected);
      const result = await client.getRoot();
      expect(result).toEqual(expected);
    });
  });

  describe('listChildren', () => {
    it('returns ContentResponse[]', async () => {
      const children = [makeContent({ id: 'child-1' }), makeContent({ id: 'child-2' })];
      nock('http://localhost:9999').get('/api/content/parent-1/children').reply(200, children);
      const result = await client.listChildren('parent-1');
      expect(result).toEqual(children);
      expect(result).toHaveLength(2);
    });
  });

  describe('getBody', () => {
    it('returns string body on success', async () => {
      nock('http://localhost:9999')
        .get('/api/content/note-1/body')
        .reply(200, '# Hello', { 'Content-Type': 'text/markdown' });
      const result = await client.getBody('note-1');
      expect(result).toBe('# Hello');
    });

    it('returns null on 404', async () => {
      nock('http://localhost:9999')
        .get('/api/content/note-1/body')
        .reply(404, { title: 'Not Found', status: 404 });
      const result = await client.getBody('note-1');
      expect(result).toBeNull();
    });

    it('throws ApiError on non-404 error', async () => {
      nock('http://localhost:9999')
        .get('/api/content/note-1/body')
        .reply(500, { title: 'Internal Server Error', status: 500, detail: 'boom' });
      await expect(client.getBody('note-1')).rejects.toThrow(ApiError);
    });
  });

  describe('putBody', () => {
    it('sends expectedRevision in query and returns ContentResponse', async () => {
      const body = '# Updated';
      const contentType = 'text/markdown';
      const expectedRevision = 'rev-2';
      const response = makeContent({ id: 'note-1' });
      nock('http://localhost:9999')
        .put('/api/content/note-1/body', body)
        .query({ expectedRevision })
        .matchHeader('content-type', contentType)
        .reply(200, response);
      const result = await client.putBody('note-1', body, contentType, expectedRevision);
      expect(result.id).toBe('note-1');
    });
  });

  describe('createContent', () => {
    it('POSTs CreateContentRequest and returns ContentResponse', async () => {
      const response = makeContent({ id: 'new-id', name: 'New Note' });
      nock('http://localhost:9999').post('/api/content').reply(201, response);
      const result = await client.createContent({
        name: 'New Note',
        parentId: 'parent-1',
      });
      expect(result.id).toBe('new-id');
    });
  });

  describe('patchContent', () => {
    it('PATCHes with UpdateContentRequest and returns ContentResponse', async () => {
      const response = makeContent({ id: 'note-1', name: 'Renamed' });
      nock('http://localhost:9999').patch('/api/content/note-1').reply(200, response);
      const result = await client.patchContent('note-1', { name: 'Renamed' });
      expect(result.name).toBe('Renamed');
    });
  });

  describe('deleteContent', () => {
    it('sends cascade param (default true)', async () => {
      nock('http://localhost:9999')
        .delete('/api/content/note-1')
        .query({ cascade: 'true' })
        .reply(204);
      await expect(client.deleteContent('note-1')).resolves.toBeUndefined();
    });

    it('sends cascade=false when explicitly passed', async () => {
      nock('http://localhost:9999')
        .delete('/api/content/note-1')
        .query({ cascade: 'false' })
        .reply(204);
      await expect(client.deleteContent('note-1', false)).resolves.toBeUndefined();
    });
  });

  // ── Card endpoints ──

  describe('getCards', () => {
    it('returns CardResponse[]', async () => {
      const cards = [makeCard({ id: 'card-1' }), makeCard({ id: 'card-2' })];
      nock('http://localhost:9999').get('/api/content/deck-1/cards').reply(200, cards);
      const result = await client.getCards('deck-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('createCard', () => {
    it('POSTs CreateCardRequest and returns CardResponse', async () => {
      const response = makeCard({ id: 'new-card', front: 'New Q' });
      nock('http://localhost:9999').post('/api/content/deck-1/cards').reply(201, response);
      const result = await client.createCard('deck-1', { front: 'New Q', back: 'New A' });
      expect(result.id).toBe('new-card');
    });
  });

  describe('updateCard', () => {
    it('PATCHes with UpdateCardRequest and returns CardResponse', async () => {
      const response = makeCard({ id: 'card-1', front: 'Updated' });
      nock('http://localhost:9999').patch('/api/content/deck-1/cards/card-1').reply(200, response);
      const result = await client.updateCard('deck-1', 'card-1', { front: 'Updated' });
      expect(result.front).toBe('Updated');
    });
  });

  describe('deleteCard', () => {
    it('DELETEs and returns 204', async () => {
      nock('http://localhost:9999').delete('/api/content/deck-1/cards/card-1').reply(204);
      await expect(client.deleteCard('deck-1', 'card-1')).resolves.toBeUndefined();
    });
  });

  // ── ApiError ──

  describe('ApiError', () => {
    it('carries status and problem details', async () => {
      const problem = {
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Content not found',
      };
      nock('http://localhost:9999').get('/api/content/note-404').reply(404, problem);

      let caught: ApiError | undefined;
      try {
        await client.getContent('note-404');
      } catch (err) {
        caught = err as ApiError;
      }

      expect(caught).toBeInstanceOf(ApiError);
      expect(caught!.status).toBe(404);
      expect(caught!.problem).toEqual(problem);
      expect(caught!.message).toBe(problem.detail);
    });

    it('falls back to title when detail is absent', async () => {
      nock('http://localhost:9999')
        .get('/api/content/note-500')
        .reply(500, { title: 'Server Error', status: 500 });

      try {
        await client.getContent('note-500');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(500);
        expect((err as ApiError).message).toBe('Server Error');
      }
    });

    it('has status 0 and no problem on network error', async () => {
      nock('http://localhost:9999').get('/api/content/root').replyWithError('connect ECONNREFUSED');

      try {
        await client.getRoot();
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(0);
        expect((err as ApiError).problem).toBeUndefined();
      }
    });
  });
});
