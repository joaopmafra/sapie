# AuthenticatedUser


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**uid** | **string** | Unique user identifier | [default to undefined]
**email** | **string** | User email address | [optional] [default to undefined]
**displayName** | **string** | User display name | [optional] [default to undefined]
**photoURL** | **string** | User profile photo URL | [optional] [default to undefined]
**emailVerified** | **boolean** | Whether the user email is verified | [default to undefined]
**providerData** | [**Array&lt;ProviderDataDto&gt;**](ProviderDataDto.md) | Authentication provider information | [default to undefined]
**customClaims** | **object** | Custom claims assigned to the user | [optional] [default to undefined]

## Example

```typescript
import { AuthenticatedUser } from 'api-client';

const instance: AuthenticatedUser = {
    uid,
    email,
    displayName,
    photoURL,
    emailVerified,
    providerData,
    customClaims,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
