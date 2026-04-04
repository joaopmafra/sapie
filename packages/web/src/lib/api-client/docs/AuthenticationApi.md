# AuthenticationApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**authControllerGetCurrentUser**](#authcontrollergetcurrentuser) | **GET** /api/auth | Get current user information|

# **authControllerGetCurrentUser**
> AuthenticatedUser authControllerGetCurrentUser()

Returns detailed information about the currently authenticated user from Firebase Auth

### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.authControllerGetCurrentUser();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**AuthenticatedUser**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | User information retrieved successfully |  -  |
|**401** | Unauthorized - Valid Firebase ID token required |  -  |
|**404** | User not found in Firebase Auth |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

