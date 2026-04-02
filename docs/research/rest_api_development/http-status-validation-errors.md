# HTTP Status for Validation Errors

The standard HTTP status codes used for validation errors *depend on whether the issue is with the **syntax** (structure) of the request or the **semantics** (meaning/logic) of the data provided*.

## Primary Status Codes

- **[422 Unprocessable Content](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/422) (Recommended for semantic validation):** Use this when the request is syntactically correct (e.g., valid JSON) but the data fails business logic or validation rules.

  - **Examples:** Invalid email format, a password that is too short, or a date that is in the past when it must be in the future.
  - **Standard Choice:** It is the preferred code for modern REST APIs (used by GitHub, Shopify, and FastAPI) because it clearly distinguishes data errors from communication errors.

- **[400 Bad Request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/400) (Recommended for structural validation):** Use this when the server cannot process the request because it is fundamentally malformed.

  - **Examples:** Malformed JSON (syntax error), missing required parameters in the URL, or an incorrectly formatted request body.
  - **Note:** Some APIs (like Stripe and Salesforce) use 400 as a catch-all for all client-side validation errors for simplicity.


## Specialized Status Codes

- **409 Conflict:** Specifically used for validation errors related to the current state of a resource.
  - **Example:** Attempting to register with an email address that already exists in the database.
- **403 Forbidden:** Sometimes used when the server understands the request but refuses to fulfill it due to a business rule, though 422 is generally more descriptive for general validation.
- **415 Unsupported Media Type:** Used when the payload format (e.g., sending XML when the server expects JSON) is not supported.


## Best Practices for Responses

1. **Never use 200 OK for errors:** Returning a 200 status with an error message in the body is considered an "anti-pattern" that breaks HTTP semantics and can cause issues with caching and monitoring tools.

2. **Provide detailed feedback:** The response body should include a structured object (usually JSON) explaining exactly which fields failed and why.

   ```json
   {
     "error": "Validation Failed",
     "details": {
       "email": ["is not a valid email address"],
       "age": ["must be 18 or older"]
     }
   }
   ```

3. **Use 5xx only for server failures:** If the validation fails because the server crashed or could not reach a database, use 500 Internal Server Error or 503 Service Unavailable, not a 4xx code.
