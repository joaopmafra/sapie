# Firebase Emulator Data Persistence

Firebase Emulators do not automatically persist data by default. To save and restore data within the Firebase Emulator
Suite, you need to use the import and export functionalities.

## Exporting Data

To save the current state of your emulator data, use the `firebase emulators:export` command:

```bash
firebase emulators:export <export-directory-path>
```

Replace `<export-directory-path>` with the desired location to save your emulator data. This command will export the
data from the running emulators (Authentication, Cloud Firestore, Realtime Database, Cloud Storage) to the specified
directory.

### Auto-export on Shutdown

Alternatively, you can configure the emulators to automatically export data on shutdown by adding the `--export-on-exit`
flag when starting them:

```bash
firebase emulators:start --export-on-exit=<export-directory-path>
```

## Importing Data

To restore previously saved data to a running emulator instance, use the `firebase emulators:start` command with the
`--import` flag:

```bash
firebase emulators:start --import <export-directory-path>
```

This will load the data from the specified directory into the corresponding emulators when they start.

## Important Considerations

### Baseline Data

You can use these features to establish a baseline dataset for your tests or development, ensuring consistent data
across different sessions or team members.

### Emulators:exec

The data import and export options also work in conjunction with the `firebase emulators:exec` command, allowing you to
run scripts with pre-loaded emulator data.

### Production vs. Emulators

**Important:** Firebase Emulators are for development and testing purposes and should not be used as a production
environment for your application data.
