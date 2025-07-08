# ContentApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**contentControllerCreateContent**](#contentcontrollercreatecontent) | **POST** /api/content | Create a new note|
|[**contentControllerGetContent**](#contentcontrollergetcontent) | **GET** /api/content | Get content by parent ID|
|[**contentControllerGetRootDirectory**](#contentcontrollergetrootdirectory) | **GET** /api/content/root | Get or create user\&#39;s root directory|

# **contentControllerCreateContent**
> ContentDto contentControllerCreateContent(createContentDto)

Creates a new note with a given title and parent ID.

### Example

```typescript
import {
    ContentApi,
    Configuration,
    CreateContentDto
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let createContentDto: CreateContentDto; //

const { status, data } = await apiInstance.contentControllerCreateContent(
    createContentDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createContentDto** | **CreateContentDto**|  | |


### Return type

**ContentDto**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Note created successfully. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**403** | User is not the owner of the parent folder. |  -  |
|**409** | A note with the same name already exists in the target location. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentControllerGetContent**
> Array<ContentDto> contentControllerGetContent()

Returns a list of content items for a given parent ID.

### Example

```typescript
import {
    ContentApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let parentId: string; //The ID of the parent content item. (default to undefined)

const { status, data } = await apiInstance.contentControllerGetContent(
    parentId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **parentId** | [**string**] | The ID of the parent content item. | defaults to undefined|


### Return type

**Array<ContentDto>**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Content retrieved successfully. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentControllerGetRootDirectory**
> ContentDto contentControllerGetRootDirectory()

Returns the authenticated user\'s root directory (\"My Contents\"). If the directory doesn\'t exist, it will be automatically created. This is the entry point for all content management operations.

### Example

```typescript
import {
    ContentApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

const { status, data } = await apiInstance.contentControllerGetRootDirectory();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ContentDto**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Root directory retrieved or created successfully |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**500** | Internal server error - Failed to ensure root directory |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

