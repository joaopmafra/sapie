# ContentApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**contentControllerCreateContent**](#contentcontrollercreatecontent) | **POST** /api/content | Create a new note|
|[**contentControllerGetContentById**](#contentcontrollergetcontentbyid) | **GET** /api/content/{id} | Get content item by ID|
|[**contentControllerGetRootDirectory**](#contentcontrollergetrootdirectory) | **GET** /api/content/root | Get or create user\&#39;s root directory|
|[**contentControllerListContents**](#contentcontrollerlistcontents) | **GET** /api/content/{id}/children | List a parent\&#39;s children|
|[**contentControllerRenameContent**](#contentcontrollerrenamecontent) | **PATCH** /api/content/{id} | Rename content|

# **contentControllerCreateContent**
> ContentDto contentControllerCreateContent(createContentDto)

Creates a new note with a given name and parent ID.

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
|**400** | Malformed request body or parameters. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**403** | User is not the owner of the parent folder. |  -  |
|**409** | A note with the same name already exists in the target location. |  -  |
|**422** | Semantic validation failed (e.g. name length or disallowed characters). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentControllerGetContentById**
> ContentDto contentControllerGetContentById()

Returns metadata for a single note or folder owned by the authenticated user.

### Example

```typescript
import {
    ContentApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let id: string; //The ID of the content item. (default to undefined)

const { status, data } = await apiInstance.contentControllerGetContentById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | The ID of the content item. | defaults to undefined|


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
|**200** | Content item found. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | Content not found, or the authenticated user does not own it (same response to avoid leaking ids). |  -  |

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

# **contentControllerListContents**
> Array<ContentDto> contentControllerListContents()

Returns a list of content items for a given parent ID.

### Example

```typescript
import {
    ContentApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let id: string; //The ID of the parent content. (default to undefined)

const { status, data } = await apiInstance.contentControllerListContents(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | The ID of the parent content. | defaults to undefined|


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

# **contentControllerRenameContent**
> ContentDto contentControllerRenameContent(updateContentNameDto)

Updates the display name of a content. Names must be unique among siblings (same parent).

### Example

```typescript
import {
    ContentApi,
    Configuration,
    UpdateContentNameDto
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let id: string; //The ID of the content. (default to undefined)
let updateContentNameDto: UpdateContentNameDto; //

const { status, data } = await apiInstance.contentControllerRenameContent(
    id,
    updateContentNameDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateContentNameDto** | **UpdateContentNameDto**|  | |
| **id** | [**string**] | The ID of the content. | defaults to undefined|


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
|**200** | Content renamed successfully. |  -  |
|**400** | Malformed request body or parameters. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | Content not found, or the authenticated user does not own it (same response to avoid leaking ids). |  -  |
|**409** | Another item with the same name already exists in this location. |  -  |
|**422** | Semantic validation failed (e.g. name length or disallowed characters). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

