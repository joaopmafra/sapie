# UpdateContentRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | New display name (1–200 chars). Spaces allowed. Cannot contain \\ / : * ? \&quot; &lt; &gt; | or control characters. Omit the property when only changing other fields (e.g. future &#x60;parentId&#x60; moves); do not send &#x60;null&#x60;. | [optional] [default to undefined]
**parentId** | **string** | Target parent folder id after a move/reparent. **Not implemented yet** — the API returns &#x60;400 Bad Request&#x60; if this property is present (including &#x60;null&#x60;). | [optional] [default to undefined]
**tags** | **Array&lt;string&gt;** | Tags for categorization (e.g. \&quot;content-root\&quot;, \&quot;knowledge-area\&quot;). Only supported for folder-type content. Sending this for note or deck types returns 400. | [optional] [default to undefined]

## Example

```typescript
import { UpdateContentRequest } from 'api-client';

const instance: UpdateContentRequest = {
    name,
    parentId,
    tags,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
