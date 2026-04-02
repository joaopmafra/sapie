# NestJS Validation

For a robust NestJS architecture, you should definitely use a **combination of both**. This approach follows the "fail
fast" principle: catch structural errors at the entry point and handle complex logic where it belongs.

Here is the recommended breakdown of responsibilities:

## 1\. Validation Pipeline (DTO Layer)

Use the `ValidationPipe` with `class-validator` for **syntactic and structural validation**. This ensures the data
entering your system is "shaped" correctly.

- **What to validate:** Data types (string, number), required fields, string length, regex formats (email, UUID), and
  array constraints.
- **Why:** It is synchronous, high-performance, and prevents malformed data from ever reaching your expensive business
  logic or database.
- **Best Practice:** Set `whitelist: true` and `forbidNonWhitelisted: true` in your global pipe configuration to
  automatically reject any extra, unmapped properties.

## 2\. Service Layer (Business Logic)

Handle **semantic and stateful validation** here. These are rules that depend on the current state of your application
or external data.

- **What to validate:** Checking if a username is already taken, verifying if a user has enough balance for a
  transaction, or ensuring a referenced ID actually exists in the database.
- **Why:** Business rules often require database queries or calls to other services. Keeping this in the service layer
  makes your code easier to test and reuse across different controllers (e.g., REST API and WebSockets).

## Why not use Custom Decorators for everything?

While you *can* create custom decorators that inject services into DTOs, it often leads to "fat DTOs" that are hard to
unit test and tightly coupled to your database. Keeping DTOs as **pure data contracts** and Services as **logic
providers** makes your codebase much cleaner.
