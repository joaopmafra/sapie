# Firebase Setup for Authentication

This document explains how to set up Firebase Authentication for the Sapie web application.

## Quick Start (Development)

The application is configured to work with placeholder Firebase configuration in development mode. However, for full functionality, you'll need to set up a Firebase project.

## Setting up Firebase Project

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "sapie-dev")
4. Choose whether to enable Google Analytics (optional for development)
5. Click "Create project"

### 2. Enable Authentication

1. In your Firebase project console, go to "Authentication" in the left sidebar
2. Click "Get started" if it's your first time
3. Go to the "Sign-in method" tab
4. Enable the following providers:
   - **Email/Password**: Click on it and toggle "Enable"
   - **Google**: Click on it, toggle "Enable", and configure:
     - Add your support email
     - For development, you can use `localhost:5173` as an authorized domain

### 3. Configure Web App

1. In the Firebase console, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (`</>`)
4. Register your app with a nickname (e.g., "sapie-web")
5. Copy the Firebase configuration object

### 4. Set Environment Variables

Create a `.env.local` file in the `packages/web` directory with your Firebase configuration:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API Configuration
VITE_API_BASE_URL=http://localhost:5001
```

### 5. Configure Google OAuth (Optional)

If you want to enable Google Sign-In:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (or create credentials for it)
3. Go to "APIs & Services" > "Credentials"
4. Configure the OAuth consent screen:
   - Choose "External" for testing
   - Fill in the required information
   - Add your email as a test user
5. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:5173` (for development)
   - Authorized redirect URIs: `http://localhost:5173/__/auth/handler` (for development)

### 6. Firebase Security Rules (Production)

For production, configure Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Add other collection rules as needed
  }
}
```

## Testing with Firebase Emulators

To test with Firebase emulators during development:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init` (select Emulators)
4. Start emulators: `firebase emulators:start`

The application is configured to automatically connect to emulators when running in development mode.

## Environment Variables Reference

| Variable                            | Description                  | Example                                   |
|-------------------------------------|------------------------------|-------------------------------------------|
| `VITE_FIREBASE_API_KEY`             | Firebase Web API Key         | `AIzaSyDOCAbC123dEf456GhI789jKl012-MnO3P` |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Firebase Auth Domain         | `myproject.firebaseapp.com`               |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase Project ID          | `myproject`                               |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Firebase Storage Bucket      | `myproject.appspot.com`                   |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `123456789012`                            |
| `VITE_FIREBASE_APP_ID`              | Firebase Web App ID          | `1:123456789012:web:abc123def456`         |


## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Check that your `VITE_FIREBASE_API_KEY` is correct
- Ensure the `.env.local` file is in the correct location (`packages/web/.env.local`)
- Restart your development server after adding environment variables

### Authentication not working
- Verify that Email/Password and Google providers are enabled in Firebase Console
- Check that your domain is added to the authorized domains list
- For Google Sign-In, ensure OAuth credentials are properly configured

### Emulator connection issues
- Make sure Firebase emulators are running
- Check that ports 9099 (Auth) and 8080 (Firestore) are available
- Verify Firebase CLI is installed and project is initialized 

## References
 - https://firebase.google.com/docs/auth/web/start#web
 - https://firebase.google.com/docs/auth/web/google-signin
