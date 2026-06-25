# Intercept network call and replace response

To intercept a network call and replace its response in JavaScript, you can ***monkey patch the global `fetch` API or `XMLHttpRequest` object**, or use a browser **Service Worker***. [stackoverflow](https://stackoverflow.com/questions/16959359/intercept-xmlhttprequest-and-modify-responsetext)

The most common approach for modern web applications is overriding the native `window.fetch` function. [stackoverflow](https://stackoverflow.com/questions/45425169/intercept-fetch-api-requests-and-responses-in-javascript)

## Intercepting the `fetch` API

This script overrides the global `fetch` method, captures targeted URLs, and returns a custom mock `Response` object instead of hitting the real server. [stackoverflow](https://stackoverflow.com/questions/45425169/intercept-fetch-api-requests-and-responses-in-javascript)

```javascript
// 1. Store a reference to the original fetch function
const { fetch: originalFetch } = window;

// 2. Override the global fetch function
window.fetch = async (...args) => {
  const [resource, config] = args;

  // Normalize the URL string from the request resource
  const requestUrl = resource instanceof Request ? resource.url : resource;

  // 3. Check for the specific endpoint you want to intercept
  if (requestUrl.includes('/api/v1/user-profile')) {
    console.log(`Intercepted fetch call to: ${requestUrl}`);

    // 4. Define your fake response data
    const mockData = {
      id: 42,
      name: "John Doe (Mocked)",
      role: "Administrator"
    };

    // 5. Return a brand new Response object
    return new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 6. Fallback to the original fetch for all other requests
  return originalFetch(...args);
};
```

## Intercepting Legacy `XMLHttpRequest` (XHR)

If the application relies on older AJAX libraries (like legacy jQuery), you must modify `XMLHttpRequest.prototype` to intercept the response text. [stackoverflow](https://stackoverflow.com/questions/16959359/intercept-xmlhttprequest-and-modify-responsetext)

```javascript
// 1. Store a reference to the original open and send methods
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  // Save the URL on the instance to check it later during response handling
  this._url = url; 
  return originalOpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(body) {
  // Listen for the readystatechange event to capture the completed response
  this.addEventListener('readystatechange', function() {
    if (this.readyState === 4 && this._url.includes('/api/v1/user-profile')) {

      // Define fake response text
      const mockResponse = JSON.stringify({ name: "Jane Doe (XHR Mocked)" });

      // Overwrite the response properties using Object.defineProperty
      Object.defineProperty(this, 'responseText', { writable: true, value: mockResponse });
      Object.defineProperty(this, 'response', { writable: true, value: mockResponse });
    }
  });

  return originalSend.apply(this, arguments);
};
```

## Advanced: Using a Service Worker

For a production-grade, low-level interception framework that works outside the main thread and can intercept static assets, utilize a [MDN Service Worker Fetch Event](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent).

```javascript
// Inside your service-worker.js file
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/v1/user-profile')) {

    // Construct a custom mock Response
    const mockResponse = new Response(
      JSON.stringify({ message: "Intercepted by Service Worker" }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Hijack the network request and resolve immediately with the mock
    event.respondWith(mockResponse);
  }
});
```
