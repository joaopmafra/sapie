# ContentDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Unique identifier for the content item | [default to undefined]
**name** | **string** | Display name of the content item | [default to undefined]
**type** | **string** | Type of content | [default to undefined]
**parentId** | **object** | ID of the parent directory, null for root directory | [default to undefined]
**ownerId** | **string** | ID of the user who owns this content | [default to undefined]
**contentUrl** | **object** | URL to the actual content file (only for files) | [optional] [default to undefined]
**size** | **object** | Size of the content in bytes (only for files) | [optional] [default to undefined]
**createdAt** | **string** | Timestamp when the content was created | [default to undefined]
**updatedAt** | **string** | Timestamp when the content was last updated | [default to undefined]

## Example

```typescript
import { ContentDto } from 'api-client';

const instance: ContentDto = {
    id,
    name,
    type,
    parentId,
    ownerId,
    contentUrl,
    size,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
