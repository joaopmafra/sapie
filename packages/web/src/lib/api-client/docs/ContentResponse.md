# ContentResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Unique identifier for the content (metadata) | [default to undefined]
**name** | **string** | Display name of the content | [default to undefined]
**type** | **string** | Type of content | [default to undefined]
**parentId** | **string** | ID of the parent directory, null for root directory | [default to undefined]
**ownerId** | **string** | ID of the user who owns this content | [default to undefined]
**bodyUri** | **object** | **Notes only.** Object path of the content body in the default storage bucket (&#x60;ownerId/content/contentId&#x60;), without a &#x60;gs://&#x60; or &#x60;https://&#x60; prefix — portable across providers. Omitted for directories. Null until the first body save. | [optional] [default to undefined]
**size** | **object** | **Notes only.** Byte size of the content body after the last &#x60;PUT …/body&#x60;. Omitted for directories. Null before the first body save. | [optional] [default to undefined]
**bodyMimeType** | **object** | **Notes only.** IANA media type of the content body from the last &#x60;PUT …/body&#x60; (e.g. &#x60;text/plain&#x60;, &#x60;image/png&#x60;). Omitted for directories. Null until the first body save. | [optional] [default to undefined]
**createdAt** | **string** | Timestamp when the content was created | [default to undefined]
**updatedAt** | **string** | Timestamp when the content was last updated | [default to undefined]

## Example

```typescript
import { ContentResponse } from 'api-client';

const instance: ContentResponse = {
    id,
    name,
    type,
    parentId,
    ownerId,
    bodyUri,
    size,
    bodyMimeType,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
