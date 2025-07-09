## api-client@1.0

This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition will be automatically resolved via `package.json`. ([Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run `npm publish`

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install api-client@1.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to *http://localhost*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AppApi* | [**appControllerGetHello**](docs/AppApi.md#appcontrollergethello) | **GET** /api | Get API status
*AuthenticationApi* | [**authControllerGetCurrentUser**](docs/AuthenticationApi.md#authcontrollergetcurrentuser) | **GET** /api/auth | Get current user information
*ContentApi* | [**contentControllerCreateContent**](docs/ContentApi.md#contentcontrollercreatecontent) | **POST** /api/content | Create a new note
*ContentApi* | [**contentControllerGetContent**](docs/ContentApi.md#contentcontrollergetcontent) | **GET** /api/content | Get content by parent ID
*ContentApi* | [**contentControllerGetRootDirectory**](docs/ContentApi.md#contentcontrollergetrootdirectory) | **GET** /api/content/root | Get or create user\&#39;s root directory
*HealthApi* | [**healthControllerGetHealth**](docs/HealthApi.md#healthcontrollergethealth) | **GET** /api/health | Health check endpoint


### Documentation For Models

 - [AuthControllerGetCurrentUser401Response](docs/AuthControllerGetCurrentUser401Response.md)
 - [AuthenticatedUser](docs/AuthenticatedUser.md)
 - [ContentDto](docs/ContentDto.md)
 - [CreateContentDto](docs/CreateContentDto.md)
 - [HealthControllerGetHealth200Response](docs/HealthControllerGetHealth200Response.md)
 - [ProviderDataDto](docs/ProviderDataDto.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="bearer"></a>
### bearer

- **Type**: Bearer authentication (JWT)

