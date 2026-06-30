# StudyApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**studyControllerGetDueCards**](#studycontrollergetduecards) | **GET** /api/study/due-cards | Get due cards for content roots|

# **studyControllerGetDueCards**
> StudyControllerGetDueCards200Response studyControllerGetDueCards()

Returns all due cards (dueDate <= now) from decks under the given content roots. Cards are ordered by dueDate ascending (oldest due first).

### Example

```typescript
import {
    StudyApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new StudyApi(configuration);

let rootIds: string; //Comma-separated content root IDs (default to undefined)

const { status, data } = await apiInstance.studyControllerGetDueCards(
    rootIds
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rootIds** | [**string**] | Comma-separated content root IDs | defaults to undefined|


### Return type

**StudyControllerGetDueCards200Response**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Due cards returned successfully. |  -  |
|**400** | Missing or invalid rootIds parameter. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

