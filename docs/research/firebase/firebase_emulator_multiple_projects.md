# Running multiple projects on Firebase Emulator

The Firebase Emulator Suite is primarily designed to emulate a **single project ID** at a time for interconnected services like Cloud Functions and Firestore triggers. However, you can manage and switch between multiple projects, or run multiple *isolated instances* of the emulator simultaneously using specific configurations and commands.

## Running a Single Emulator Instance with Multiple Projects

For a typical development workflow where you switch between environments (e.g., `dev` and `staging`), the recommended approach is to use the `firebase use` command or the `--project` flag to specify the active project ID for your CLI commands.

- **Specify the project ID in the CLI:** When starting the emulators, use the `--project` flag to ensure all services within that suite instance use the specified project configuration.

  ```bash
  firebase emulators:start --project=your-project-id-1
  ```

- **Switch projects with `firebase use`**: You can use the `firebase use` command in your project directory to set the default project before starting the emulators.

  ```bash
  firebase use your-project-id-1
  firebase emulators:start
  ```

## Running Multiple Isolated Emulator Instances

If you need two different project environments running *simultaneously* (e.g., for different teams or testing scenarios where cross-emulator communication is needed but within separate contexts), you can run multiple independent instances of the emulator suite by defining separate ports and configuration files.

1. **Create separate `firebase.json` files:** Define different port configurations in a separate `firebase.json` file for each instance.

2. **Use the `--config` flag:** When starting each emulator instance, point to its specific configuration file using the `--config` flag.

   ```bash
   # Instance 1 with default ports (e.g., 8080 for Firestore)
   firebase emulators:start --config=firebase-instance-1.json

   # Instance 2 with different ports (e.g., 8081 for Firestore)
   firebase emulators:start --config=firebase-instance-2.json
   ```

## Using Multiple Projects within a Single Application

If your client application needs to connect to multiple Firebase projects simultaneously (e.g., for accessing two different database instances), you must initialize a distinct Firebase app object for each project within your application code.

- Initialize each project using unique options, as described in the [Firebase documentation](https://firebase.google.com/docs/projects/multiprojects) on configuring multiple projects in your application.

## Key Considerations

- **Single Project Mode**: The emulators run best when all components assume a single, consistent project ID.
- **Avoid Conflicts**: Running multiple emulator instances without separate port configurations can cause "weird bugs" and unexpected behavior.
- **Environment Separation**: Google generally recommends using separate Firebase projects for different environments (development, staging, production) to prevent data pollution, rather than running multiple production-like instances in one local setup.
