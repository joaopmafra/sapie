# Firebase Admin SDK Setup

This document explains how to configure Firebase Admin SDK for the Sapie API.

## Overview

The Firebase Admin SDK is used for server-side authentication and user management. It's configured to work in multiple environments:

- **Production (Firebase Functions)**: Uses default service account credentials automatically
- **Development with Firebase Emulator**: Uses demo project configuration (no service account needed)
- **Local Development**: Can use service account key file or default credentials

## What is a Firebase Service Account?

A Firebase service account is a special type of Google Cloud service account that provides server-side authentication for your application to securely interact with Firebase services. It represents your application (not a user) when making authenticated requests.

### Service Account Purpose:
- **Verify Firebase ID tokens** sent from your React frontend
- **Access Firebase Admin SDK** features like user management  
- **Perform administrative operations** on Firebase services

### Service Account Types:
1. **Service Account Key File** (Development) - JSON file with private keys
2. **Default Credentials** (Production) - Automatically provided by Firebase Functions

## Configuration

### Production Deployment

**✅ No service account setup required**

Firebase Functions automatically provide the necessary default credentials. Your application initializes with:
```typescript
admin.initializeApp(); // Uses default credentials
```

### Development with Firebase Emulator (Recommended)

**✅ No service account required**

When using Firebase emulators with `FUNCTIONS_EMULATOR=true`, the system:
- Uses a demo project ID (`'demo-emulator'`)
- Initializes without requiring credentials
- Connects to local Firebase Auth emulator (localhost:9099)
- Provides complete isolation from production data

**Benefits:**
- **Simpler** - No credential files to manage
- **Safer** - No risk of using production data
- **Faster** - No additional setup required
- **Isolated** - Perfect for testing without side effects

The emulator automatically sets `FUNCTIONS_EMULATOR=true` and connects to:
- **Firebase Auth Emulator**: http://localhost:9099
- **Demo Project**: No real Firebase project connection needed

### Local Development with Service Account (Optional)

**⚠️ Only needed if testing against real Firebase project**

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
| `FUNCTIONS_EMULATOR`                | Set to 'true' by Firebase emulator   | Auto-set             |
| `NODE_ENV`                          | Environment (production/development) | Recommended          |
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | Path to service account JSON file    | Local dev (optional) |

## Development Scenarios Summary

| Scenario              | Service Account Needed? | Credentials Used               |
|-----------------------|-------------------------|--------------------------------|
| **Firebase Emulator** | ❌ No                    | Demo project                   |
| **Local Development** | ⚠️ Optional             | Service account key or default |
| **Production**        | ✅ Auto-provided         | Default credentials            |

## Security Best Practices

1. **Never commit service account keys** to version control
2. **Use Firebase emulators for development** (preferred approach)
3. **Use environment-specific configurations** 
4. **Rotate service account keys** regularly if used in production
5. **Use principle of least privilege** for service account permissions
6. **Monitor service account usage** in Firebase Console

## Troubleshooting

### Common Issues

1. **"Firebase Admin not initialized"**:
   - Ensure `initializeFirebaseAdmin()` is called before using Firebase services
   - Check that credentials are properly configured

2. **"Service account key not found"**:
   - Verify the path in `FIREBASE_SERVICE_ACCOUNT_KEY_PATH`
   - Ensure the file exists and is readable

3. **"Project not found"**:
   - For emulator: Ensure `FUNCTIONS_EMULATOR=true` is set
   - For real project: Check that the service account has access to the project

4. **"Token verification failed"**:
   - Ensure client and server use the same Firebase project
   - Check that the ID token is valid and not expired
   - Verify emulator configuration matches between frontend and backend

### Debugging

Enable debug logging:

```bash
export DEBUG=firebase-admin:*
```

Check Firebase Admin initialization in application logs for:
- Environment detection (production/emulator/development)
- Credential initialization method used
- Any initialization errors

## Testing

The Firebase Admin configuration includes error handling and logging to help with debugging. Monitor the console output for initialization status and any errors.

For unit testing, consider mocking Firebase Admin SDK functions to avoid requiring actual Firebase credentials in test environments.

## Recommended Development Workflow

1. **Primary Development**: Use Firebase emulators with demo project (no service account needed)
2. **Integration Testing**: Continue with emulators for consistency
3. **Pre-Production Testing**: Optionally test against real Firebase project with service account
4. **Production**: Deploy to Firebase Functions (automatic credential handling)
```
