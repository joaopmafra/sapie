# ContentBodySummaryResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**mimeType** | **string** | IANA media type of the stored body from the last successful &#x60;PUT …/body&#x60; (e.g. &#x60;text/plain&#x60;, &#x60;image/png&#x60;). | [default to undefined]
**size** | **number** | Byte size of the stored body after the last &#x60;PUT …/body&#x60;. | [default to undefined]
**createdAt** | **string** | When the body object was first written for this note. | [default to undefined]
**updatedAt** | **string** | When the body bytes last changed. Clients use this (not top-level &#x60;updatedAt&#x60;) to decide whether to re-download body bytes. | [default to undefined]

## Example

```typescript
import { ContentBodySummaryResponse } from 'api-client';

const instance: ContentBodySummaryResponse = {
    mimeType,
    size,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
