import { ContentRepository } from '../repositories/content-repository.service';
import { ContentControllerFixture } from './content.controller.fixture';
import { HttpStatus } from '@nestjs/common';

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
});
