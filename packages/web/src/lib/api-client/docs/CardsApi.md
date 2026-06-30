# CardsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**cardControllerCreateCard**](#cardcontrollercreatecard) | **POST** /api/content/{deckId}/cards | Create a flashcard|
|[**cardControllerDeleteCard**](#cardcontrollerdeletecard) | **DELETE** /api/content/{deckId}/cards/{cardId} | Delete a flashcard|
|[**cardControllerGetCards**](#cardcontrollergetcards) | **GET** /api/content/{deckId}/cards | List all flashcards in a deck|
|[**cardControllerRecordStudyResult**](#cardcontrollerrecordstudyresult) | **PATCH** /api/content/{deckId}/cards/{cardId}/study-result | Record a study result for a card|
|[**cardControllerUpdateCard**](#cardcontrollerupdatecard) | **PATCH** /api/content/{deckId}/cards/{cardId} | Update a flashcard|

# **cardControllerCreateCard**
> CardResponse cardControllerCreateCard(createCardRequest)

Creates a new flashcard in the specified deck.

### Example

```typescript
import {
    CardsApi,
    Configuration,
    CreateCardRequest
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CardsApi(configuration);

let deckId: string; //The ID of the deck to add the card to. (default to undefined)
let createCardRequest: CreateCardRequest; //

const { status, data } = await apiInstance.cardControllerCreateCard(
    deckId,
    createCardRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createCardRequest** | **CreateCardRequest**|  | |
| **deckId** | [**string**] | The ID of the deck to add the card to. | defaults to undefined|


### Return type

**CardResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Card created successfully. |  -  |
|**400** | Malformed request body or parameters. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | Deck not found, or the authenticated user does not own it. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cardControllerDeleteCard**
> cardControllerDeleteCard()

Deletes a flashcard from the specified deck.

### Example

```typescript
import {
    CardsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CardsApi(configuration);

let deckId: string; //The ID of the deck containing the card. (default to undefined)
let cardId: string; //The ID of the card to delete. (default to undefined)

const { status, data } = await apiInstance.cardControllerDeleteCard(
    deckId,
    cardId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deckId** | [**string**] | The ID of the deck containing the card. | defaults to undefined|
| **cardId** | [**string**] | The ID of the card to delete. | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Card deleted successfully. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | Card or deck not found, or the authenticated user does not own it. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cardControllerGetCards**
> Array<CardResponse> cardControllerGetCards()

Returns all cards belonging to the specified deck.

### Example

```typescript
import {
    CardsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CardsApi(configuration);

let deckId: string; //The ID of the deck whose cards to list. (default to undefined)

const { status, data } = await apiInstance.cardControllerGetCards(
    deckId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deckId** | [**string**] | The ID of the deck whose cards to list. | defaults to undefined|


### Return type

**Array<CardResponse>**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Cards retrieved successfully. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | Deck not found, or the authenticated user does not own it. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cardControllerRecordStudyResult**
> CardResponse cardControllerRecordStudyResult()

Rates a card with \"know\" or \"dont_know\" and applies the SM-2 spaced repetition algorithm. Updates dueDate, interval, repetitions, lastResult, lastStudied, correctCount, and incorrectCount.

### Example

```typescript
import {
    CardsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CardsApi(configuration);

let deckId: string; //The deck ID (default to undefined)
let cardId: string; //The card ID (default to undefined)

const { status, data } = await apiInstance.cardControllerRecordStudyResult(
    deckId,
    cardId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deckId** | [**string**] | The deck ID | defaults to undefined|
| **cardId** | [**string**] | The card ID | defaults to undefined|


### Return type

**CardResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Study result recorded successfully. |  -  |
|**400** | Invalid result value or deck is not a deck. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | Card or deck not found, or the authenticated user does not own it. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cardControllerUpdateCard**
> CardResponse cardControllerUpdateCard(updateCardRequest)

Partially updates a flashcard. At least one of `front` or `back` must be provided.

### Example

```typescript
import {
    CardsApi,
    Configuration,
    UpdateCardRequest
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CardsApi(configuration);

let deckId: string; //The ID of the deck containing the card. (default to undefined)
let cardId: string; //The ID of the card to update. (default to undefined)
let updateCardRequest: UpdateCardRequest; //

const { status, data } = await apiInstance.cardControllerUpdateCard(
    deckId,
    cardId,
    updateCardRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateCardRequest** | **UpdateCardRequest**|  | |
| **deckId** | [**string**] | The ID of the deck containing the card. | defaults to undefined|
| **cardId** | [**string**] | The ID of the card to update. | defaults to undefined|


### Return type

**CardResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Card updated successfully. |  -  |
|**400** | Malformed request body or parameters. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | Card or deck not found, or the authenticated user does not own it. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

