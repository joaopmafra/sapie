import { HttpStatus } from '@nestjs/common';

import type { ProblemDetailsBody } from '../../common/dto/problem-details.dto';
import { ContentRepository } from '../repositories/content-repository.service';
import { CONTENT_NAME_MAX_LENGTH } from '../validation/content-name.validation';
import { ContentControllerFixture } from './content.controller.fixture';

describe('ContentController', () => {
  const fixture = new ContentControllerFixture();

  beforeAll(async () => {
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.clearDatabase();
  });

  afterAll(async () => {
    await fixture.close();
  });

  it(`GET ${fixture.API_CONTENT_ROOT} uses FakeAuthGuard user from header`, async () => {
    const response = await fixture.callGetApiContentRootExpectingOk(fixture.TEST_USER_ID);
    expect(response.body).toHaveProperty('ownerId', fixture.TEST_USER_ID);
  });

  it(`GET ${fixture.API_CONTENT_ROOT} creates the root directory if it does not exist yet`, async () => {
    const rootDirectory = await fixture
      .getComponent(ContentRepository)
      .findRootDirectory(fixture.TEST_USER_ID);
    expect(rootDirectory).toBeNull();

    const response = await fixture.callGetApiContentRootExpectingOk(fixture.TEST_USER_ID);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('ownerId', fixture.TEST_USER_ID);
    expect(response.body).toHaveProperty('type', 'directory');
    expect(response.body).toHaveProperty('parentId', null);
    expect(response.body).not.toHaveProperty('bodyUri');
    expect(response.body).not.toHaveProperty('size');
    expect(response.body).not.toHaveProperty('bodyMimeType');
  });

  it(`GET ${fixture.API_CONTENT_ROOT} is idempotent`, async () => {
    const firstResponseBody = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const secondResponseBody = await fixture.callApiGetRootDirectoryExpectingOkAsContent(
      fixture.TEST_USER_ID
    );

    expect(secondResponseBody.id).toBe(firstResponseBody.id);
  });

  it(`POST ${fixture.API_CONTENT} creates a note (happy path)`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    const response = await fixture.callApiCreateNoteExpectingCreated(fixture.TEST_USER_ID, {
      name: 'My Note',
      parentId: root.id,
    });

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name', 'My Note');
    expect(response.body).toHaveProperty('type', 'note');
    expect(response.body).toHaveProperty('ownerId', fixture.TEST_USER_ID);
  });

  it(`POST ${fixture.API_CONTENT} rejects duplicate name in same parent with 409`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    await fixture.seedNote(fixture.TEST_USER_ID, 'My Note', root.id);

    await fixture
      .callApiCreateNote(fixture.TEST_USER_ID, {
        name: 'My Note',
        parentId: root.id,
      })
      .expect(HttpStatus.CONFLICT);
  });

  it(`POST ${fixture.API_CONTENT} rejects wrong owner with 403`, async () => {
    const testUserRoot = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiCreateNote(fixture.OTHER_USER_ID, {
        name: 'My Note',
        parentId: testUserRoot.id,
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it(`POST ${fixture.API_CONTENT} returns 422 problem+json for empty name`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    const response = await fixture
      .callApiCreateNote(fixture.TEST_USER_ID, { name: '', parentId: root.id })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);

    expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
    const body = response.body as unknown as ProblemDetailsBody;
    expect(body).toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      title: 'Unprocessable Entity',
    });
    const nameErrors = body.errors?.find(e => e.path === '/name');
    expect(nameErrors).toBeDefined();
    expect(nameErrors?.messages.length).toBeGreaterThan(0);
  });

  it(`POST ${fixture.API_CONTENT} returns 422 when name contains path separator`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiCreateNote(fixture.TEST_USER_ID, { name: 'a/b', parentId: root.id })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it(`POST ${fixture.API_CONTENT} returns 422 when name exceeds max length`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiCreateNote(fixture.TEST_USER_ID, {
        name: 'x'.repeat(CONTENT_NAME_MAX_LENGTH + 1),
        parentId: root.id,
      })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it(`GET ${fixture.API_CONTENT}/:id returns a note (happy path)`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Single', root.id);

    const body = await fixture.callApiGetContentByIdExpectingOkAsContent(
      fixture.TEST_USER_ID,
      note.id
    );

    expect(body).toMatchObject({
      id: note.id,
      name: 'Single',
      type: 'note',
      ownerId: fixture.TEST_USER_ID,
      parentId: root.id,
    });
  });

  it(`GET ${fixture.API_CONTENT}/:id returns 404 when content does not exist`, async () => {
    await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiGetContentById(fixture.TEST_USER_ID, 'non-existent-id')
      .expect(HttpStatus.NOT_FOUND);
  });

  it(`GET ${fixture.API_CONTENT}/:id returns 404 when caller does not own the content`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Private', root.id);

    await fixture
      .callApiGetContentById(fixture.OTHER_USER_ID, note.id)
      .expect(HttpStatus.NOT_FOUND);
  });

  it(`GET ${fixture.API_CONTENT} lists only content for parent and owner`, async () => {
    const userOneRoot = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const userTwoRoot = await fixture.seedRootDirectory(fixture.OTHER_USER_ID);

    await fixture.seedNote(fixture.TEST_USER_ID, 'User1 Note A', userOneRoot.id);
    await fixture.seedNote(fixture.TEST_USER_ID, 'User1 Note B', userOneRoot.id);
    await fixture.seedNote(fixture.OTHER_USER_ID, 'User2 Note A', userTwoRoot.id);

    const contentArray = await fixture.callApiGetContentByParentIdExpectingOkAsContentArray(
      fixture.TEST_USER_ID,
      userOneRoot.id
    );

    expect(contentArray).toHaveLength(2);
    expect(contentArray.map(content => content.ownerId)).toEqual([
      fixture.TEST_USER_ID,
      fixture.TEST_USER_ID,
    ]);
    expect(contentArray.map(content => content.name).sort()).toEqual([
      'User1 Note A',
      'User1 Note B',
    ]);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id returns 400 for an empty JSON body`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Ok', root.id);

    await fixture
      .callApiPatchContent(fixture.TEST_USER_ID, note.id, {})
      .expect(HttpStatus.BAD_REQUEST);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id returns 400 when parentId is sent (not implemented yet)`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Ok', root.id);

    await fixture
      .callApiPatchContent(fixture.TEST_USER_ID, note.id, { parentId: root.id })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id returns 422 for invalid new name`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Ok', root.id);

    await fixture
      .callApiPatchContent(fixture.TEST_USER_ID, note.id, { name: 'bad:name' })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id renames a note (happy path)`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Original', root.id);

    const response = await fixture.callApiPatchContentExpectingOk(fixture.TEST_USER_ID, note.id, {
      name: 'Renamed',
    });

    expect(response.body).toHaveProperty('id', note.id);
    expect(response.body).toHaveProperty('name', 'Renamed');
    expect(response.body).toHaveProperty('type', 'note');
    expect(response.body).toHaveProperty('ownerId', fixture.TEST_USER_ID);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id rejects duplicate name in same parent with 409`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    await fixture.seedNote(fixture.TEST_USER_ID, 'First', root.id);
    const second = await fixture.seedNote(fixture.TEST_USER_ID, 'Second', root.id);

    await fixture
      .callApiPatchContent(fixture.TEST_USER_ID, second.id, { name: 'First' })
      .expect(HttpStatus.CONFLICT);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id succeeds when name is unchanged`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Same', root.id);

    const response = await fixture.callApiPatchContentExpectingOk(fixture.TEST_USER_ID, note.id, {
      name: 'Same',
    });

    expect(response.body).toHaveProperty('name', 'Same');
    expect(response.body).toHaveProperty('id', note.id);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id returns 404 when content does not exist`, async () => {
    await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiPatchContent(fixture.TEST_USER_ID, 'non-existent-id', { name: 'Nope' })
      .expect(HttpStatus.NOT_FOUND);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id returns 404 when caller does not own the content`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Private', root.id);

    await fixture
      .callApiPatchContent(fixture.OTHER_USER_ID, note.id, { name: 'Hijack' })
      .expect(HttpStatus.NOT_FOUND);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id renames the root directory`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    const response = await fixture.callApiPatchContentExpectingOk(fixture.TEST_USER_ID, root.id, {
      name: 'Renamed Root',
    });

    expect(response.body).toHaveProperty('id', root.id);
    expect(response.body).toHaveProperty('name', 'Renamed Root');
    expect(response.body).toHaveProperty('type', 'directory');
    expect(response.body).toHaveProperty('parentId', null);
  });

  it(`GET ${fixture.API_CONTENT}/:id/body returns 404 when content has no body yet`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Empty', root.id);

    await fixture
      .callApiGetContentBodySignedUrl(fixture.TEST_USER_ID, note.id)
      .expect(HttpStatus.NOT_FOUND);
  });

  it(`GET ${fixture.API_CONTENT}/:id/body returns 403 when caller does not own the content`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Private', root.id);

    await fixture
      .callApiGetContentBodySignedUrl(fixture.OTHER_USER_ID, note.id)
      .expect(HttpStatus.FORBIDDEN);
  });

  it(`GET ${fixture.API_CONTENT}/:id/body returns 404 when content does not exist`, async () => {
    await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiGetContentBodySignedUrl(fixture.TEST_USER_ID, 'non-existent-id')
      .expect(HttpStatus.NOT_FOUND);
  });

  it(`GET ${fixture.API_CONTENT}/:id/body returns 400 for a directory`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiGetContentBodySignedUrl(fixture.TEST_USER_ID, root.id)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it(`PUT ${fixture.API_CONTENT}/:id/body saves text body and updates metadata`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Doc', root.id);

    const putResponse = await fixture
      .callApiPutContentBody(fixture.TEST_USER_ID, note.id, '# Hello')
      .expect(HttpStatus.OK);

    expect(putResponse.body).toMatchObject({
      id: note.id,
      type: 'note',
      ownerId: fixture.TEST_USER_ID,
      bodyMimeType: 'text/plain',
    });
    expect(putResponse.body).toHaveProperty('size', Buffer.byteLength('# Hello', 'utf8'));

    const meta = await fixture.callApiGetContentByIdExpectingOkAsContent(
      fixture.TEST_USER_ID,
      note.id
    );
    expect(meta.size).toBe(Buffer.byteLength('# Hello', 'utf8'));
    expect(meta.bodyMimeType).toBe('text/plain');

    const signed = await fixture
      .callApiGetContentBodySignedUrl(fixture.TEST_USER_ID, note.id)
      .expect(HttpStatus.OK);

    const signedBody = signed.body as { signedUrl: string; expiresAt: string };
    expect(signedBody.signedUrl).toMatch(/^https?:\/\//);
    expect(signedBody.expiresAt).toBeTruthy();
    expect(() => new Date(signedBody.expiresAt)).not.toThrow();

    const bodyRes = await fetch(signedBody.signedUrl);
    expect(bodyRes.ok).toBe(true);
    expect(await bodyRes.text()).toBe('# Hello');
    expect(bodyRes.headers.get('content-type')).toMatch(/text\/plain/);
  });

  it(`PUT ${fixture.API_CONTENT}/:id/body accepts non-text Content-Type and preserves bytes`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Binary', root.id);
    const payload = Buffer.from([0, 1, 2, 255]);

    const putResponse = await fixture
      .callApiPutContentBody(fixture.TEST_USER_ID, note.id, payload, 'application/octet-stream')
      .expect(HttpStatus.OK);

    expect(putResponse.body).toMatchObject({
      id: note.id,
      bodyMimeType: 'application/octet-stream',
      size: payload.length,
    });

    const signed = await fixture
      .callApiGetContentBodySignedUrl(fixture.TEST_USER_ID, note.id)
      .expect(HttpStatus.OK);
    const signedBody = signed.body as { signedUrl: string };
    const bodyRes = await fetch(signedBody.signedUrl);
    expect(bodyRes.ok).toBe(true);
    expect(Buffer.from(await bodyRes.arrayBuffer())).toEqual(payload);
  });

  it(`PUT ${fixture.API_CONTENT}/:id/body returns 415 for multipart Content-Type`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'M', root.id);

    await fixture
      .callApiPutContentBody(
        fixture.TEST_USER_ID,
        note.id,
        '--x',
        'multipart/form-data; boundary=x'
      )
      .expect(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
  });

  it(`PUT ${fixture.API_CONTENT}/:id/body returns 403 when caller does not own the content`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Mine', root.id);

    await fixture
      .callApiPutContentBody(fixture.OTHER_USER_ID, note.id, 'x')
      .expect(HttpStatus.FORBIDDEN);
  });

  it(`PUT ${fixture.API_CONTENT}/:id/body returns 404 when content does not exist`, async () => {
    await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiPutContentBody(fixture.TEST_USER_ID, 'non-existent-id', 'x')
      .expect(HttpStatus.NOT_FOUND);
  });

  it(`PUT ${fixture.API_CONTENT}/:id/body returns 400 for a directory`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiPutContentBody(fixture.TEST_USER_ID, root.id, 'x')
      .expect(HttpStatus.BAD_REQUEST);
  });
});
