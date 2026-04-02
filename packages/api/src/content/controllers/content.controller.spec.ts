import { ContentRepository } from '../repositories/content-repository.service';
import { ContentControllerFixture } from './content.controller.fixture';
import { HttpStatus } from '@nestjs/common';
import { CONTENT_NAME_MAX_LENGTH } from '../validation/content-name.validation';

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

  it(`POST ${fixture.API_CONTENT} returns 400 for empty name`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiCreateNote(fixture.TEST_USER_ID, { name: '', parentId: root.id })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it(`POST ${fixture.API_CONTENT} returns 400 when name contains path separator`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiCreateNote(fixture.TEST_USER_ID, { name: 'a/b', parentId: root.id })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it(`POST ${fixture.API_CONTENT} returns 400 when name exceeds max length`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiCreateNote(fixture.TEST_USER_ID, {
        name: 'x'.repeat(CONTENT_NAME_MAX_LENGTH + 1),
        parentId: root.id,
      })
      .expect(HttpStatus.BAD_REQUEST);
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

  it(`PATCH ${fixture.API_CONTENT}/:id returns 400 for invalid new name`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Ok', root.id);

    await fixture
      .callApiPatchContentName(fixture.TEST_USER_ID, note.id, { name: 'bad:name' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id renames a note (happy path)`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Original', root.id);

    const response = await fixture.callApiPatchContentNameExpectingOk(
      fixture.TEST_USER_ID,
      note.id,
      { name: 'Renamed' }
    );

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
      .callApiPatchContentName(fixture.TEST_USER_ID, second.id, { name: 'First' })
      .expect(HttpStatus.CONFLICT);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id succeeds when name is unchanged`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Same', root.id);

    const response = await fixture.callApiPatchContentNameExpectingOk(
      fixture.TEST_USER_ID,
      note.id,
      { name: 'Same' }
    );

    expect(response.body).toHaveProperty('name', 'Same');
    expect(response.body).toHaveProperty('id', note.id);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id returns 404 when content does not exist`, async () => {
    await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    await fixture
      .callApiPatchContentName(fixture.TEST_USER_ID, 'non-existent-id', { name: 'Nope' })
      .expect(HttpStatus.NOT_FOUND);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id returns 404 when caller does not own the content`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);
    const note = await fixture.seedNote(fixture.TEST_USER_ID, 'Private', root.id);

    await fixture
      .callApiPatchContentName(fixture.OTHER_USER_ID, note.id, { name: 'Hijack' })
      .expect(HttpStatus.NOT_FOUND);
  });

  it(`PATCH ${fixture.API_CONTENT}/:id renames the root directory`, async () => {
    const root = await fixture.seedRootDirectory(fixture.TEST_USER_ID);

    const response = await fixture.callApiPatchContentNameExpectingOk(
      fixture.TEST_USER_ID,
      root.id,
      { name: 'Renamed Root' }
    );

    expect(response.body).toHaveProperty('id', root.id);
    expect(response.body).toHaveProperty('name', 'Renamed Root');
    expect(response.body).toHaveProperty('type', 'directory');
    expect(response.body).toHaveProperty('parentId', null);
  });
});
