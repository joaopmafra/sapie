# CreateContentRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Display name (1–200 chars). Spaces allowed. Cannot contain \\ / : * ? \&quot; &lt; &gt; | or control characters. | [default to undefined]
**parentId** | **string** | ID of the parent directory | [default to undefined]
**type** | **string** | Kind of content to create. Omit or &#x60;note&#x60; for a note under a folder; &#x60;directory&#x60; for a folder under a folder. | [optional] [default to TypeEnum_Note]

## Example

```typescript
import { CreateContentRequest } from 'api-client';

const instance: CreateContentRequest = {
    name,
    parentId,
    type,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
