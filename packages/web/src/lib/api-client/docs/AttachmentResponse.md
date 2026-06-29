# AttachmentResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Unique attachment id (UUID). | [default to undefined]
**noteId** | **string** | Parent note id. | [default to undefined]
**mimeType** | **string** | IANA media type from the last successful &#x60;PUT …/body&#x60;. | [default to undefined]
**size** | **number** | Byte size after the last &#x60;PUT …/body&#x60;. | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** |  | [default to undefined]

## Example

```typescript
import { AttachmentResponse } from 'api-client';

const instance: AttachmentResponse = {
    id,
    noteId,
    mimeType,
    size,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
