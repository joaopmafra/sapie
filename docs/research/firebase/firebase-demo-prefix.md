# Firebase Demo Prefix on Project Names

Prefixing Firebase projects with `demo-` (e.g., `demo-test-project`) when using
the [Local Emulator Suite](https://firebase.google.com/docs/emulator-suite) *provides critical safety and convenience
features for local testing*:

- **Strict Local Isolation:** When a project ID starts with `demo-`,
  the [Firebase SDKs](https://firebase.google.com/docs/emulator-suite/connect_auth) and CLI are instructed to **only**
  interact with local emulators.
- **Safety Against Production Leaks:** If your code attempts to access a service for which an emulator is not running,
  the request will fail immediately rather than "falling back" to a real production resource in the cloud. This prevents
  accidental data corruption, unexpected billing, or usage of live production keys.
- **No Cloud Project Required:** Using the `demo-` prefix allows you to run emulators without ever creating a project in
  the Firebase Console. You can prototype and test entirely offline without a Google Cloud configuration.
- **Easy Setup for Tutorials:** This prefix is standard in Firebase Codelabs and tutorials to ensure students can follow
  along without needing to set up their own paid or free-tier cloud projects.

To use this feature, you can start your emulators by specifying a demo project name via the Firebase CLI:

```bash
firebase emulators:start --project demo-your-project-name
```
