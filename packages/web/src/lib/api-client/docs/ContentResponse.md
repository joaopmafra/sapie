# ContentResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Unique identifier for the content (metadata) | [default to undefined]
**name** | **string** | Display name of the content | [default to undefined]
**type** | **string** | Type of content | [default to undefined]
**parentId** | **string** | ID of the parent directory, null for root directory | [default to undefined]
**ownerId** | **string** | ID of the user who owns this content | [default to undefined]
**body** | [**ContentBodySummaryResponse**](ContentBodySummaryResponse.md) | **Notes only.** Public summary of the stored body. Omitted for directories. &#x60;null&#x60; before the first &#x60;PUT …/body&#x60;. | [optional] [default to undefined]
**createdAt** | **string** | Timestamp when the content was created | [default to undefined]
**updatedAt** | **string** | Timestamp when content metadata last changed (e.g. rename). Distinct from &#x60;body.updatedAt&#x60;, which tracks body bytes. | [default to undefined]

## Example

```typescript
import { ContentResponse } from 'api-client';

const instance: ContentResponse = {
    id,
    name,
    type,
    parentId,
    ownerId,
    body,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
