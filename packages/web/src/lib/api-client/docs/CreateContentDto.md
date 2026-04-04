# CreateContentDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Display name (1–200 chars). Spaces allowed. Cannot contain \\ / : * ? \&quot; &lt; &gt; | or control characters. | [default to undefined]
**parentId** | **string** | ID of the parent directory | [default to undefined]

## Example

```typescript
import { CreateContentDto } from 'api-client';

const instance: CreateContentDto = {
    name,
    parentId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
