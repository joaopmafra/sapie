# ProblemDetailsDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **string** | URI reference that identifies the problem type | [default to undefined]
**title** | **string** | Short, human-readable summary of the problem type | [default to undefined]
**status** | **number** | HTTP status code | [default to undefined]
**detail** | **string** | Human-readable explanation specific to this occurrence | [default to undefined]
**instance** | **string** | URI reference identifying this specific occurrence (e.g. request path). Omitted when not available, such as before a resource identifier exists. | [optional] [default to undefined]
**errors** | [**Array&lt;ProblemDetailsErrorItemDto&gt;**](ProblemDetailsErrorItemDto.md) | Per-field validation failures (extension member) | [optional] [default to undefined]

## Example

```typescript
import { ProblemDetailsDto } from 'api-client';

const instance: ProblemDetailsDto = {
    type,
    title,
    status,
    detail,
    errors,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
