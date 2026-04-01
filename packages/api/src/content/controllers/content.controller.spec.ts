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
    const firstResponseBody = await fixture.callApiGetRootDirectoryExpectingOkAsContent(
      fixture.TEST_USER_ID
    );
    const secondResponseBody = await fixture.callApiGetRootDirectoryExpectingOkAsContent(
      fixture.TEST_USER_ID
    );

    expect(secondResponseBody.id).toBe(firstResponseBody.id);
  });

  it(`POST ${fixture.API_CONTENT} creates a note (happy path)`, async () => {
    const rootDirectory = await fixture.callApiGetRootDirectoryExpectingOkAsContent(
      fixture.TEST_USER_ID
    );

    const response = await fixture.callApiCreateNoteExpectingCreated(fixture.TEST_USER_ID, {
      name: 'My Note',
      parentId: rootDirectory.id,
    });

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name', 'My Note');
    expect(response.body).toHaveProperty('type', 'note');
    expect(response.body).toHaveProperty('ownerId', fixture.TEST_USER_ID);
  });

  it(`POST ${fixture.API_CONTENT} rejects duplicate name in same parent with 409`, async () => {
    const rootDirectory = await fixture.callApiGetRootDirectoryExpectingOkAsContent(
      fixture.TEST_USER_ID
    );

    await fixture.callApiCreateNoteExpectingCreated(fixture.TEST_USER_ID, {
      name: 'My Note',
      parentId: rootDirectory.id,
    });

    await fixture
      .callApiCreateNote(fixture.TEST_USER_ID, {
        name: 'My Note',
        parentId: rootDirectory.id,
      })
      .expect(HttpStatus.CONFLICT);
  });
});
