# ContentApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**contentControllerCreateContent**](#contentcontrollercreatecontent) | **POST** /api/content | Create content (note)|
|[**contentControllerGetContentBodySignedUrl**](#contentcontrollergetcontentbodysignedurl) | **GET** /api/content/{id}/body/signed-url | Get signed URL to read content body|
|[**contentControllerGetContentById**](#contentcontrollergetcontentbyid) | **GET** /api/content/{id} | Get content by ID|
|[**contentControllerGetRootDirectory**](#contentcontrollergetrootdirectory) | **GET** /api/content/root | Get or create user\&#39;s root directory|
|[**contentControllerListContents**](#contentcontrollerlistcontents) | **GET** /api/content/{id}/children | List a parent\&#39;s children|
|[**contentControllerPatchContent**](#contentcontrollerpatchcontent) | **PATCH** /api/content/{id} | Patch content metadata|
|[**contentControllerPutContentBody**](#contentcontrollerputcontentbody) | **PUT** /api/content/{id}/body | Upload or replace content body|

# **contentControllerCreateContent**
> ContentResponse contentControllerCreateContent(createContentRequest)

Creates leaf content under the given parent. MVP only creates items of type `note`; other kinds may reuse or extend this contract later.

### Example

```typescript
import {
    ContentApi,
    Configuration,
    CreateContentRequest
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let createContentRequest: CreateContentRequest; //

const { status, data } = await apiInstance.contentControllerCreateContent(
    createContentRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createContentRequest** | **CreateContentRequest**|  | |


### Return type

**ContentResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Content (metadata) created successfully. |  -  |
|**400** | Malformed request body or parameters. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**403** | User is not the owner of the parent folder. |  -  |
|**409** | Content with the same name already exists in the target location. |  -  |
|**422** | Semantic validation failed (e.g. name length or disallowed characters). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentControllerGetContentBodySignedUrl**
> ContentBodyUrlResponse contentControllerGetContentBodySignedUrl()

Returns a short-lived signed URL for downloading the content body from Cloud Storage (valid 10 minutes). 404 when the content has no content body yet (client may treat as empty). `GET /:id` returns metadata only and never includes body bytes. 

### Example

```typescript
import {
    ContentApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let id: string; //The ID of the content whose content body is read (leaf types such as a note in MVP). (default to undefined)

const { status, data } = await apiInstance.contentControllerGetContentBodySignedUrl(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | The ID of the content whose content body is read (leaf types such as a note in MVP). | defaults to undefined|


### Return type

**ContentBodyUrlResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Signed URL and expiry. |  -  |
|**400** | Body storage is not applicable (e.g. directory). |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**403** | Authenticated user does not own this content. |  -  |
|**404** | Content not found, no content body yet, or wrong type (see operation description). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentControllerGetContentById**
> ContentResponse contentControllerGetContentById()

Returns Firestore metadata for the content (e.g. directory or note). Does not include the content body; use `GET …/body/signed-url` for a signed read URL. Directory items omit `bodyUri`, `size`, and `bodyMimeType`; notes include those fields (null until the first `PUT …/body`).

### Example

```typescript
import {
    ContentApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let id: string; //The ID of the content. (default to undefined)

const { status, data } = await apiInstance.contentControllerGetContentById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | The ID of the content. | defaults to undefined|


### Return type

**ContentResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Content (metadata) found. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | Content not found, or the authenticated user does not own it (same response to avoid leaking ids). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentControllerGetRootDirectory**
> ContentResponse contentControllerGetRootDirectory()

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

**ContentResponse**

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
> Array<ContentResponse> contentControllerListContents()

Returns child content (metadata only) for the given parent ID. Does not load content bodies or signed read URLs. Directory items omit `bodyUri`, `size`, and `bodyMimeType`; notes include those fields (null until the first `PUT …/body`).

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

**Array<ContentResponse>**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Child content (metadata) returned successfully. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentControllerPatchContent**
> ContentResponse contentControllerPatchContent(updateContentRequest)

Partially updates content metadata. Today this supports renaming (`name`). Moving an item to another folder (`parentId`) will use the same route; that behavior is **not implemented yet** and returns `400 Bad Request` if `parentId` is sent. Content body bytes and storage-derived fields (`bodyUri`, `size`, `bodyMimeType`) are changed only via `PUT …/body`. When renaming, names must stay unique among siblings under the same parent.

### Example

```typescript
import {
    ContentApi,
    Configuration,
    UpdateContentRequest
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let id: string; //The ID of the content. (default to undefined)
let updateContentRequest: UpdateContentRequest; //

const { status, data } = await apiInstance.contentControllerPatchContent(
    id,
    updateContentRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateContentRequest** | **UpdateContentRequest**|  | |
| **id** | [**string**] | The ID of the content. | defaults to undefined|


### Return type

**ContentResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Content metadata updated successfully. |  -  |
|**400** | Malformed request body or parameters, empty patch body, reserved fields not yet supported (e.g. &#x60;parentId&#x60;), or rename requested without a &#x60;name&#x60; field. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | Content not found, or the authenticated user does not own it (same response to avoid leaking ids). |  -  |
|**409** | Other content in this location already uses that name. |  -  |
|**422** | Semantic validation failed (e.g. name length or disallowed characters). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentControllerPutContentBody**
> ContentResponse contentControllerPutContentBody(body)

Single endpoint for any raw body type the client declares via `Content-Type`. Updates Cloud Storage object metadata and Firestore (`bodyUri`, `size`, `bodyMimeType`).

### Example

```typescript
import {
    ContentApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ContentApi(configuration);

let id: string; //The ID of the content whose content body is replaced (leaf types such as a note in MVP). (default to undefined)
let contentType: string; // (default to undefined)
let body: File; //Raw bytes of the content body. The `Content-Type` header sets the stored media type (e.g. markdown as `text/plain` or `text/markdown`, images as `image/_*`). Omitting `Content-Type` defaults to `application/octet-stream`. `multipart/_*` is rejected (415) until explicitly supported.

const { status, data } = await apiInstance.contentControllerPutContentBody(
    id,
    contentType,
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **File**| Raw bytes of the content body. The &#x60;Content-Type&#x60; header sets the stored media type (e.g. markdown as &#x60;text/plain&#x60; or &#x60;text/markdown&#x60;, images as &#x60;image/_*&#x60;). Omitting &#x60;Content-Type&#x60; defaults to &#x60;application/octet-stream&#x60;. &#x60;multipart/_*&#x60; is rejected (415) until explicitly supported. | |
| **id** | [**string**] | The ID of the content whose content body is replaced (leaf types such as a note in MVP). | defaults to undefined|
| **contentType** | [**string**] |  | defaults to undefined|


### Return type

**ContentResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/octet-stream, text/plain, text/markdown, image/png, image/jpeg
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated content metadata (no inline content body). |  -  |
|**400** | Body storage is not applicable (e.g. directory) or malformed request. |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**403** | Authenticated user does not own this content. |  -  |
|**404** | Content not found. |  -  |
|**415** | Unsupported media type (e.g. multipart body on this route). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

