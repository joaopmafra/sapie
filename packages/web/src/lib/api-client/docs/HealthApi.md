# HealthApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**healthControllerGetHealth**](#healthcontrollergethealth) | **GET** /api/health | Health check endpoint|

# **healthControllerGetHealth**
> HealthControllerGetHealth200Response healthControllerGetHealth()


### Example

```typescript
import {
    HealthApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.healthControllerGetHealth();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**HealthControllerGetHealth200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Returns the health status of the API |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

