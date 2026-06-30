## api-client@1.0

This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition will be automatically resolved via `package.json`. ([Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run `npm publish`

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install api-client@1.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to *http://localhost*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AppApi* | [**appControllerGetHello**](docs/AppApi.md#appcontrollergethello) | **GET** /api | Get API status
*AuthenticationApi* | [**authControllerGetCurrentUser**](docs/AuthenticationApi.md#authcontrollergetcurrentuser) | **GET** /api/auth | Get current user information
*CardsApi* | [**cardControllerCreateCard**](docs/CardsApi.md#cardcontrollercreatecard) | **POST** /api/content/{deckId}/cards | Create a flashcard
*CardsApi* | [**cardControllerDeleteCard**](docs/CardsApi.md#cardcontrollerdeletecard) | **DELETE** /api/content/{deckId}/cards/{cardId} | Delete a flashcard
*CardsApi* | [**cardControllerGetCards**](docs/CardsApi.md#cardcontrollergetcards) | **GET** /api/content/{deckId}/cards | List all flashcards in a deck
*CardsApi* | [**cardControllerRecordStudyResult**](docs/CardsApi.md#cardcontrollerrecordstudyresult) | **PATCH** /api/content/{deckId}/cards/{cardId}/study-result | Record a study result for a card
*CardsApi* | [**cardControllerUpdateCard**](docs/CardsApi.md#cardcontrollerupdatecard) | **PATCH** /api/content/{deckId}/cards/{cardId} | Update a flashcard
*ContentApi* | [**contentControllerCreateContent**](docs/ContentApi.md#contentcontrollercreatecontent) | **POST** /api/content | Create content (note or folder)
*ContentApi* | [**contentControllerDeleteContent**](docs/ContentApi.md#contentcontrollerdeletecontent) | **DELETE** /api/content/{id} | Soft-delete content (note or directory)
*ContentApi* | [**contentControllerGetBlob**](docs/ContentApi.md#contentcontrollergetblob) | **GET** /api/content/{contentId}/blobs/{blobId} | Stream blob bytes
*ContentApi* | [**contentControllerGetContentBody**](docs/ContentApi.md#contentcontrollergetcontentbody) | **GET** /api/content/{id}/body | Stream content body bytes
*ContentApi* | [**contentControllerGetContentBodySignedUrl**](docs/ContentApi.md#contentcontrollergetcontentbodysignedurl) | **GET** /api/content/{id}/body/signed-url | Get signed URL to read content body
*ContentApi* | [**contentControllerGetContentById**](docs/ContentApi.md#contentcontrollergetcontentbyid) | **GET** /api/content/{id} | Get content by ID
*ContentApi* | [**contentControllerGetRootDirectory**](docs/ContentApi.md#contentcontrollergetrootdirectory) | **GET** /api/content/root | Get or create user\&#39;s root directory
*ContentApi* | [**contentControllerGetRoots**](docs/ContentApi.md#contentcontrollergetroots) | **GET** /api/content/roots | List content roots
*ContentApi* | [**contentControllerListContents**](docs/ContentApi.md#contentcontrollerlistcontents) | **GET** /api/content/{id}/children | List a parent\&#39;s children
*ContentApi* | [**contentControllerPatchContent**](docs/ContentApi.md#contentcontrollerpatchcontent) | **PATCH** /api/content/{id} | Patch content metadata
*ContentApi* | [**contentControllerPostBlob**](docs/ContentApi.md#contentcontrollerpostblob) | **POST** /api/content/{contentId}/blobs | Upload a blob (inline image) for a note
*ContentApi* | [**contentControllerPutContentBody**](docs/ContentApi.md#contentcontrollerputcontentbody) | **PUT** /api/content/{id}/body | Upload or replace content body
*FakeStorageReadApi* | [**fakeStorageReadControllerRead**](docs/FakeStorageReadApi.md#fakestoragereadcontrollerread) | **GET** /api/fake-storage/read | 
*HealthApi* | [**healthControllerGetHealth**](docs/HealthApi.md#healthcontrollergethealth) | **GET** /api/health | Health check endpoint
*StudyApi* | [**studyControllerGetDueCards**](docs/StudyApi.md#studycontrollergetduecards) | **GET** /api/study/due-cards | Get due cards for content roots


### Documentation For Models

 - [AuthControllerGetCurrentUser401Response](docs/AuthControllerGetCurrentUser401Response.md)
 - [AuthenticatedUser](docs/AuthenticatedUser.md)
 - [CardResponse](docs/CardResponse.md)
 - [ContentBodySummaryResponse](docs/ContentBodySummaryResponse.md)
 - [ContentBodyUrlResponse](docs/ContentBodyUrlResponse.md)
 - [ContentControllerGetRoots200Response](docs/ContentControllerGetRoots200Response.md)
 - [ContentControllerGetRoots200ResponseRootsInner](docs/ContentControllerGetRoots200ResponseRootsInner.md)
 - [ContentControllerPostBlob201Response](docs/ContentControllerPostBlob201Response.md)
 - [ContentResponse](docs/ContentResponse.md)
 - [CreateCardRequest](docs/CreateCardRequest.md)
 - [CreateContentRequest](docs/CreateContentRequest.md)
 - [HealthControllerGetHealth200Response](docs/HealthControllerGetHealth200Response.md)
 - [ProblemDetailsDto](docs/ProblemDetailsDto.md)
 - [ProblemDetailsErrorItemDto](docs/ProblemDetailsErrorItemDto.md)
 - [ProviderDataDto](docs/ProviderDataDto.md)
 - [StudyControllerGetDueCards200Response](docs/StudyControllerGetDueCards200Response.md)
 - [StudyControllerGetDueCards200ResponseCardsInner](docs/StudyControllerGetDueCards200ResponseCardsInner.md)
 - [UpdateCardRequest](docs/UpdateCardRequest.md)
 - [UpdateContentRequest](docs/UpdateContentRequest.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="bearer"></a>
### bearer

- **Type**: Bearer authentication (JWT)

