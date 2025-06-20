# Firebase Admin SDK Setup

This document explains how to configure Firebase Admin SDK for the Sapie API.

## Overview

The Firebase Admin SDK is used for server-side authentication and user management. It's configured to work in multiple environments:

- **Production (Firebase Functions)**: Uses default service account credentials automatically
- **Development with Firebase Emulator**: Uses project ID configuration
- **Local Development**: Can use service account key file or default credentials

## Configuration

### Production Deployment

No additional configuration needed. Firebase Functions automatically provide the necessary credentials.

### Development with Firebase Emulator

Set the Firebase project ID:

```bash
export FIREBASE_PROJECT_ID=your-firebase-project-id
```

The emulator will automatically set `FUNCTIONS_EMULATOR=true`.

### Local Development with Service Account

1. **Generate Service Account Key**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely (do not commit to version control)

2. **Configure Environment Variable**:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/your-service-account-key.json
   ```

3. **Alternative: Use Application Default Credentials**:
   - Install Google Cloud SDK
   - Run `gcloud auth application-default login`
   - The SDK will use your authenticated Google account

## Environment Variables

| Variable                            | Description                          | Required             |
|-------------------------------------|--------------------------------------|----------------------|
| `FIREBASE_PROJECT_ID`               | Firebase project ID for emulator     | Emulator only        |
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | Path to service account JSON file    | Local dev (optional) |
| `FUNCTIONS_EMULATOR`                | Set to 'true' by Firebase emulator   | Auto-set             |
| `NODE_ENV`                          | Environment (production/development) | Recommended          |

## Security Best Practices

1. **Never commit service account keys** to version control
2. **Use environment-specific configurations** 
3. **Rotate service account keys** regularly in production
4. **Use principle of least privilege** for service account permissions
5. **Monitor service account usage** in Firebase Console

## Troubleshooting

### Common Issues

1. **"Firebase Admin not initialized"**:
   - Ensure `initializeFirebaseAdmin()` is called before using Firebase services
   - Check that credentials are properly configured

2. **"Service account key not found"**:
   - Verify the path in `FIREBASE_SERVICE_ACCOUNT_KEY_PATH`
   - Ensure the file exists and is readable

3. **"Project not found"**:
   - Check `FIREBASE_PROJECT_ID` matches your Firebase project
   - Ensure the service account has access to the project

4. **"Token verification failed"**:
   - Ensure client and server use the same Firebase project
   - Check that the ID token is valid and not expired

### Debugging

Enable debug logging:

```bash
export DEBUG=firebase-admin:*
```

Check Firebase Admin initialization in application logs.

## Testing

The Firebase Admin configuration includes error handling and logging to help with debugging. Monitor the console output for initialization status and any errors.

For unit testing, consider mocking Firebase Admin SDK functions to avoid requiring actual Firebase credentials in test environments. 
