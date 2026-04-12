# ContentBodyUrlResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**signedUrl** | **string** | Short-lived HTTPS URL to download the content body object from Cloud Storage | [default to undefined]
**expiresAt** | **string** | ISO-8601 instant when signedUrl expires | [default to undefined]

## Example

```typescript
import { ContentBodyUrlResponse } from 'api-client';

const instance: ContentBodyUrlResponse = {
    signedUrl,
    expiresAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
